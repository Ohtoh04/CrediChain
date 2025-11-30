import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";

describe("credichain", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Credichain as anchor.Program<any>;

  async function createLoan(totalAmount: number, interestBps: number, durationSeconds: number) {
    const loan = anchor.web3.Keypair.generate();
    const [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), loan.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createLoan(new BN(totalAmount), interestBps, new BN(durationSeconds))
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        borrower: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([loan])
      .rpc();

    return { loan, escrowPda };
  }

  async function fundWithTwoLenders(loan: anchor.web3.Keypair, escrowPda: anchor.web3.PublicKey) {
    const lender1 = anchor.web3.Keypair.generate();
    const lender2 = anchor.web3.Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lender1.publicKey, 2e9)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(lender2.publicKey, 2e9)
    );

    await program.methods
      .fundLoan(new BN(400_000))
      .accounts({ loan: loan.publicKey, escrow: escrowPda, lender: lender1.publicKey, borrower: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
      .signers([lender1])
      .rpc();

    await program.methods
      .fundLoan(new BN(600_000))
      .accounts({ loan: loan.publicKey, escrow: escrowPda, lender: lender2.publicKey, borrower: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
      .signers([lender2])
      .rpc();

    return { lender1, lender2 };
  }

  it("Loan A: repay on time", async () => {
    const { loan, escrowPda } = await createLoan(1_000_000, 500, 3600);
    const { lender1, lender2 } = await fundWithTwoLenders(loan, escrowPda);

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(provider.wallet.publicKey, 1e9)
    );

    const accBefore = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan A before repay:", {
      fundedAmount: accBefore.fundedAmount.toString(),
      dueTs: accBefore.dueTs.toString(),
      status: accBefore.status,
    });

    const interest = accBefore.totalAmount.mul(new BN(accBefore.interestBps)).div(new BN(10000));
    const repayAmount = accBefore.totalAmount.add(interest);

    const lenders = accBefore.lenders.map((key: anchor.web3.PublicKey) => ({
      pubkey: key,
      isWritable: true,
      isSigner: false,
    }));

    await program.methods
      .repayLoan(repayAmount)
      .accounts({ loan: loan.publicKey, escrow: escrowPda, borrower: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
      .remainingAccounts(lenders)
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan A after repay:", {
      repaidTs: acc.repaidTs.toString(),
      status: acc.status,
      borrowerBalance: await provider.connection.getBalance(provider.wallet.publicKey),
      lender1Balance: await provider.connection.getBalance(lender1.publicKey),
      lender2Balance: await provider.connection.getBalance(lender2.publicKey),
    });

    if (!("repaidOnTime" in acc.status)) {
      throw new Error("Loan A was not marked as repaid on time");
    }
  });

  it("Loan B: repay late", async () => {
    const { loan, escrowPda } = await createLoan(1_000_000, 500, 2);
    const { lender1, lender2 } = await fundWithTwoLenders(loan, escrowPda);

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(provider.wallet.publicKey, 1e9)
    );

    const accBefore = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan B before repay:", {
      fundedAmount: accBefore.fundedAmount.toString(),
      dueTs: accBefore.dueTs.toString(),
      status: accBefore.status,
    });

    const interest = accBefore.totalAmount.mul(new BN(accBefore.interestBps)).div(new BN(10000));
    const repayAmount = accBefore.totalAmount.add(interest);

    const lenders = accBefore.lenders.map((key: anchor.web3.PublicKey) => ({
      pubkey: key,
      isWritable: true,
      isSigner: false,
    }));

    await new Promise(resolve => setTimeout(resolve, 4000));

    await program.methods
      .repayLoan(repayAmount)
      .accounts({ loan: loan.publicKey, escrow: escrowPda, borrower: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
      .remainingAccounts(lenders)
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan B after late repay:", {
      repaidTs: acc.repaidTs.toString(),
      status: acc.status,
      borrowerBalance: await provider.connection.getBalance(provider.wallet.publicKey),
      lender1Balance: await provider.connection.getBalance(lender1.publicKey),
      lender2Balance: await provider.connection.getBalance(lender2.publicKey),
    });

    if (!("repaidLate" in acc.status)) {
      throw new Error("Loan B was not marked as repaid late");
    }
  });

});
