import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";

describe("credichain", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Credichain as anchor.Program<any>;

  let loan: anchor.web3.Keypair;
  let escrowPda: anchor.web3.PublicKey;
  let bump: number;
  let lender1: anchor.web3.Keypair;
  let lender2: anchor.web3.Keypair;

  async function logBalances(label: string) {
    const borrowerBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    const lender1Balance = lender1 ? await provider.connection.getBalance(lender1.publicKey) : 'N/A';
    const lender2Balance = lender2 ? await provider.connection.getBalance(lender2.publicKey) : 'N/A';
    const escrowBalance = await provider.connection.getBalance(escrowPda);

    console.log(`Balances ${label}:`);
    console.log(`- Borrower: ${borrowerBalance} lamports`);
    console.log(`- Lender1: ${lender1Balance} lamports`);
    console.log(`- Lender2: ${lender2Balance} lamports`);
    console.log(`- Escrow: ${escrowBalance} lamports`);
  }

  it("Create loan", async () => {
    loan = anchor.web3.Keypair.generate();

    [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), loan.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createLoan(
        new BN(1_000_000), // 1 SOL in lamports
        500,               // 5%
        new BN(3600)       // 1 hour
      )
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        borrower: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([loan])
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan created:", acc);

    await logBalances("after create");
  });

  it("Fund loan from lender1 (partial)", async () => {
    lender1 = anchor.web3.Keypair.generate();
    const airdropSig1 = await provider.connection.requestAirdrop(lender1.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdropSig1);

    await logBalances("before lender1 fund");

    await program.methods
      .fundLoan(new BN(400_000))
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        lender: lender1.publicKey,
        borrower: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([lender1])
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("After lender1 funding:", acc);

    await logBalances("after lender1 fund");
  });

  it("Fund loan from lender2 (full funding + disbursement)", async () => {
    lender2 = anchor.web3.Keypair.generate();
    const airdropSig2 = await provider.connection.requestAirdrop(lender2.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdropSig2);

    await logBalances("before lender2 fund");

    await program.methods
      .fundLoan(new BN(600_000))
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        lender: lender2.publicKey,
        borrower: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([lender2])
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("After lender2 funding:", acc);

    await logBalances("after lender2 fund (disbursed)");
  });

  it("Repay loan", async () => {
    // Airdrop to borrower for interest payment (they received principal, but need extra for interest)
    const airdropSigBorrower = await provider.connection.requestAirdrop(provider.wallet.publicKey, 1e9);
    await provider.connection.confirmTransaction(airdropSigBorrower);

    await logBalances("before repay");

    const accBefore = await program.account.loan.fetch(loan.publicKey);

    const interest = accBefore.totalAmount.mul(new BN(accBefore.interestBps)).div(new BN(10000));
    const repayAmount = accBefore.totalAmount.add(interest);

    const lenders = accBefore.lenders.map((key: anchor.web3.PublicKey) => ({
      pubkey: key,
      isWritable: true,
      isSigner: false,
    }));

    await program.methods
      .repayLoan(repayAmount)
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        borrower: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts(lenders)
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("After repayment:", acc);

    await logBalances("after repay");
  });
});