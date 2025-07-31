# 🚩 Challenge #9 : ZKP - Model Verifier

> ⚠️ **Important:** Please complete **Challenge #8** first if you haven't already, as it contains essential instructions related to all upcoming challenges.

🎫 Build a Model Verifier using Zero-Knowledge Proofs (ZKP) on Arbitrum Stylus:

👷‍♀️ In this challenge, you'll build and deploy a smart contract that utilizes Zero-Knowledge Proofs for private model verification. You'll work with ZKP circuits, deploy them to an Arbitrum Stylus dev node, and create a frontend that allows users to generate and verify proofs! 🚀

🌟 The final deliverable is a full-stack application featuring model verification. Deploy your contract to a testnet, then build and upload your app to a public web server.

### How ZKP Integration Works
This project leverages Zero-Knowledge Proofs (ZKPs) to enable private verification of model computations on Arbitrum Stylus. Here's the workflow:

1. **Circuit Design**: The ZKP logic is defined in `.circom` files (e.g., `ModelVerifier.circom`) using the Circom language. These circuits encode the rules for verification (e.g., "is y = wx + b?") without revealing the model parameters.
2. **Proof System Setup**: We use the `snarkjs` library with the Groth16 proving system to generate proving and verification keys. The trusted setup is simulated using a pre-existing `pot12_final.ptau` file.
3. **Contract Generation**: The verification key is exported to a Solidity contract (e.g., `ModelVerifier.sol`) that runs on Arbitrum Stylus, allowing on-chain verification of zk-proofs.
4. **Frontend Interaction**: The Next.js frontend uses WebAssembly (`.wasm`) outputs from Circom to generate proofs locally, which are then submitted to the deployed contract for verification.
5. **Arbitrum Stylus Advantage**: Stylus' Rust-based environment enables efficient execution of the verifier contract, reducing gas costs compared to traditional EVM-based ZKP verification.

This integration ensures privacy (model parameters remain off-chain) and scalability (proof verification is lightweight on-chain).

## Checkpoint 0: 📦 Environment Setup 📚

Before starting, ensure you have the following installed:

- [Node.js (>= v18.17)](https://nodejs.org/en/download/)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/)
- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Clone the Repository

```bash
git clone -b stylus-zkp-model-verifier https://github.com/abhi152003/speedrun_stylus.git
cd speedrun_stylus
```

### Install Dependencies

Run the following command to install all necessary dependencies:

```bash
yarn install
```

## Checkpoint 1: 🚀 Start Your Dev Environment

### Step 1: Start the Nitro Dev Node

1. Ensure Docker is running on your machine. You can start Docker Desktop if it's not already running.
2. Navigate to the `cargo-stylus` folder:
   ```bash
   cd packages/cargo-stylus
   ```

3. Run the `run-dev-node.sh` script:
   ```bash
   bash run-dev-node.sh
   ```
   This script:
   - Spins up an Arbitrum Stylus Nitro dev node in Docker.
   - Deploys the `ModelVerifier.sol` contract.
   - Generates the ABI for interacting with the contract.

> The dev node will be accessible at `http://localhost:8547`.

**Important:** After deploying a contract, update the contract address in `packages/nextjs/app/modelVerifier/page.tsx`:

```ts
const CONTRACT_ADDRESS = "<your_new_contract_address>";
```

### Step 2: Start the Frontend

> ⚠️ **Before running the frontend:**
> 
>    Go to the `packages/nextjs` directory:
>    ```bash
>    cd packages/nextjs
>    cp .env.example .env
>    ```
>    Open the `.env` file and set:
>    ```env
>    NEXT_PUBLIC_RPC_URL=http://localhost:8547
>    NEXT_PUBLIC_PRIVATE_KEY=0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659
>    `````

Start the development server:
   ```bash
   yarn run dev
   ```

> The app will be available at [http://localhost:3000/modelVerifier](http://localhost:3000/modelVerifier).

## Checkpoint 2: 💫 Explore the Features

### Model Verifier

- **Purpose**: Prove that a linear regression model's output (y) was correctly computed as y = wx + b using secret model parameters (w and b) without revealing those parameters.
- **Circuit Logic**: The `ModelVerifier.circom` circuit takes two private inputs (w, b) and three public inputs (x, y, H). It verifies that y = wx + b and that H matches the commitment hash of the model parameters.
- **On-Chain Verification**: The generated proof is submitted to `ModelVerifier.sol` on the Stylus dev node, which uses the verification key to confirm validity.

#### Example Inputs:
- Private Inputs:
  - w (weight) = 2
  - b (bias) = 1
- Public Inputs:
  - x (input value) = 3
  - y (output value) = 7 (computed as y = wx + b = 2 * 3 + 1)
  - H (hash commitment) = [automatically computed from w and b]

The circuit will verify that:
1. The equation y = wx + b holds true (7 = 2 * 3 + 1)
2. The hash commitment H matches the provided model parameters (w, b)

![Model Verifier Interface](https://github.com/user-attachments/assets/9192372d-bb8e-41a5-a384-5c726e2a6eb9)
*Model verification interface and process flow*

- Navigate to the "Model Verifier" tab in the frontend.
- This feature interacts with the **Model Verifier** contract, which was generated from the `ModelVerifier.circom` circuit located in `packages/circuits`.
- Circuit generation commands:
  ```bash
  circom ModelVerifier.circom --r1cs --wasm --sym
  npx snarkjs groth16 setup ModelVerifier.r1cs pot12_final.ptau ModelVerifier_0000.zkey
  npx snarkjs zkey contribute ModelVerifier_0000.zkey ModelVerifier_final.zkey --name="Contributor" -v
  npx snarkjs zkey export verificationkey ModelVerifier_final.zkey verification_key.json
  npx snarkjs zkey export solidityverifier ModelVerifier_final.zkey ModelVerifier.sol
  ```
- Input the model parameters and test values in the frontend to generate a zk-proof, which will be verified on-chain using the deployed `ModelVerifier.sol` contract.

## Checkpoint 3: 🛠 Modify and Deploy Contracts

You can tinker with circuit logic by modifying files in the `packages/circuits` folder. After making changes, regenerate contracts using these commands:

```bash
circom <YourCircuit>.circom --r1cs --wasm --sym
npx snarkjs groth16 setup <YourCircuit>.r1cs pot12_final.ptau <YourCircuit>_0000.zkey
npx snarkjs zkey contribute <YourCircuit>_0000.zkey <YourCircuit>_final.zkey --name="Contributor" -v
npx snarkjs zkey export verificationkey <YourCircuit>_final.zkey verification_key.json
npx snarkjs zkey export solidityverifier <YourCircuit>_final.zkey <YourCircuit>.sol
```

Deploy new contracts by placing them in `packages/cargo-stylus/contracts` and running:

```bash
bash run-dev-node.sh
```

## 🛠️ Debugging Tips

### Fixing Line Endings for Shell Scripts on Windows (CRLF Issue)

If you encounter errors like `Command not found`, convert line endings to LF:

```bash
sudo apt install dos2unix
dos2unix run-dev-node.sh
chmod +x run-dev-node.sh
```

Run the script again:
```bash
bash run-dev-node.sh
```

## Checkpoint 4: 🚢 Ship your frontend! 🚁

To deploy your app to Vercel:

```bash
vercel
```

Follow Vercel's instructions to get a public URL.

For production deployment:
```bash
vercel --prod
```

## Checkpoint 5: 📜 Contract Verification

You can verify your deployed smart contract using:

```bash
cargo stylus verify -e http://127.0.0.1:8547 --deployment-tx "$deployment_tx"
```

Replace `$deployment_tx` with your deployment transaction hash.

## 🚀 Deploying to Arbitrum Sepolia

If you want to deploy your Age Verifier contract to the Arbitrum Sepolia testnet, follow these steps:

1. **Add private key to the .env file in the cargo-stylus folder**
   ```bash
   PRIVATE_KEY=your_private_key_of_your_ethereum_wallet
   ```
   
2. **Run the Sepolia Deployment Script**
   ```bash
   cd packages/cargo-stylus
   bash run-sepolia-deploy.sh
   ```
   This will deploy your contract to Arbitrum Sepolia and output the contract address and transaction hash.
   
   If you encounter errors like `Command not found`, convert line endings to LF:

   ```bash
   sudo apt install dos2unix
   dos2unix run-sepolia-deploy.sh
   chmod +x run-sepolia-deploy.sh
   ```

3. **Configure the Frontend for Sepolia**
   - Go to the `packages/nextjs` directory:
     ```bash
     cd packages/nextjs
     cp .env.example .env
     ```
   - Open the `.env` file and set the following variables:
     ```env
     NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
     NEXT_PUBLIC_PRIVATE_KEY=your_private_key_of_your_ethereum_wallet
     ```
     Replace `your_private_key_of_your_ethereum_wallet` with your actual Ethereum wallet private key (never share this key publicly).

4. **Start the Frontend**
   ```bash
   yarn run dev
   ```
   Your frontend will now connect to the Arbitrum Sepolia network and interact with your deployed contract.

## 🏁 Next Steps

Explore more challenges or contribute to this project!

> 🏃 Head to your next challenge [here](https://speedrunstylus.com/challenge/zkp-public-doc-verifier).