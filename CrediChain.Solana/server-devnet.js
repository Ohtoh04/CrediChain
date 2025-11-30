import express from "express";
import fs from "fs";
import path from "path";
import * as anchor from "@coral-xyz/anchor";

const app = express();
const PORT = 3001; // different port for devnet
const reputationFile = path.join(process.cwd(), "reputation-devnet.json");

// Helpers
function loadReputation() {
  if (!fs.existsSync(reputationFile)) return {};
  return JSON.parse(fs.readFileSync(reputationFile, "utf8"));
}
function saveReputation(data) {
  fs.writeFileSync(reputationFile, JSON.stringify(data, null, 2));
}

// Endpoint
app.get("/reputation/:pubkey", (req, res) => {
  const reputations = loadReputation();
  const rep = reputations[req.params.pubkey];
  if (!rep) return res.status(404).json({ error: "User not found" });
  res.json(rep);
});

// Anchor setup for devnet
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

// Load your program (make sure IDL is built and matches devnet deployment)
const program = anchor.workspace.Credichain;

// Updater
async function updateReputations() {
  const reputations = loadReputation();
  try {
    const loans = await program.account.loan.all();
    for (const { account } of loans) {
      const borrower = account.borrower.toBase58();
      if (!reputations[borrower]) {
        reputations[borrower] = {
          score: 50,
          loansTaken: 0,
          loansRepaidOnTime: 0,
          loansRepaidLate: 0,
        };
      }
      reputations[borrower].loansTaken += 1;
      if ("repaidOnTime" in account.status) {
        reputations[borrower].loansRepaidOnTime += 1;
        reputations[borrower].score = Math.min(
          100,
          reputations[borrower].score + 5
        );
      } else if ("repaidLate" in account.status) {
        reputations[borrower].loansRepaidLate += 1;
        reputations[borrower].score = Math.max(
          0,
          reputations[borrower].score - 10
        );
      }
    }
    saveReputation(reputations);
    console.log("Devnet reputations updated:", reputations);
  } catch (err) {
    console.error("Error updating devnet reputations:", err);
  }
}
setInterval(updateReputations, 60_000);

app.listen(PORT, () => {
  console.log(`Devnet reputation service running on http://localhost:${PORT}`);
});
