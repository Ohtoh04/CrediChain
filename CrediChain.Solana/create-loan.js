import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";
import fs from "fs";

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync("./devnet.json", "utf8"))
  );
  const keypair = anchor.web3.Keypair.fromSecretKey(secretKey);
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "processed",
  });
  anchor.setProvider(provider);

  // Reload IDL after build
  const idl = JSON.parse(fs.readFileSync("./target/idl/credichain.json", "utf8"));
  console.log(idl.accounts);
  console.log(idl.types);

  const program = new anchor.Program(idl, provider);

  const loan = anchor.web3.Keypair.generate();
  const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), loan.publicKey.toBuffer()],
    program.programId
  );

  console.log("Creating loan with pubkey:", loan.publicKey.toBase58());

  try {
    await program.methods
      .createLoan(new BN(1_000_000), 500, new BN(60))
      .accounts({
        loan: loan.publicKey,
        escrow: escrowPda,
        borrower: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([loan])
      .rpc();

    const acc = await program.account.loan.fetch(loan.publicKey);
    console.log("Loan created:", acc);
  } catch (err) {
    console.error("Error creating loan:", err);
  }
}

main().catch(console.error);