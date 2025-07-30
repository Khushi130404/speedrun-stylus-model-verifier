#!/bin/bash

# Start Nitro dev node in the background
echo "Starting Nitro dev node..."
docker run --rm --name nitro-dev -p 8547:8547 offchainlabs/nitro-node:v3.2.1-d81324d --dev --http.addr 0.0.0.0 --http.api=net,web3,eth,debug --http.corsdomain="*" &

# Wait for the node to initialize
echo "Waiting for the Nitro node to initialize..."
until [[ "$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
  http://127.0.0.1:8547)" == *"result"* ]]; do
    sleep 0.1
done
echo "Nitro node is running!"

# Compile the Solidity contract
echo "Compiling Solidity contract..."
npx solcjs --bin --abi --optimize -o build/ contracts/ModelVerifier.sol

if [[ $? -ne 0 ]]; then
    echo "Error: Solidity compilation failed"
    exit 1
fi

# Extract compiled contract binary and ABI
# Assuming the contract name is Groth16Verifier based on the file pattern; adjust if necessary
contract_bin=$(cat build/contracts_ModelVerifier_sol_Groth16Verifier.bin)
contract_abi=$(cat build/contracts_ModelVerifier_sol_Groth16Verifier.abi)

if [[ -z "$contract_bin" || -z "$contract_abi" ]]; then
    echo "Error: Compilation output not found"
    exit 1
fi

echo "Solidity contract compiled successfully."

# Deploy the contract to Nitro dev node
echo "Deploying the Solidity contract..."
deploy_output=$(cast send --private-key 0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659 \
  --rpc-url http://127.0.0.1:8547 \
  --create 0x$contract_bin)

# Extract deployment transaction hash using robust pattern
deployment_tx=$(echo "$deploy_output" | grep -i "transaction\|tx" | grep -oE '0x[a-fA-F0-9]{64}' | head -1)

# Extract contract address using robust pattern
contract_address=$(echo "$deploy_output" | grep "contractAddress" | grep -oE '0x[a-fA-F0-9]{40}')

# Fallback extraction if above patterns don't work
if [[ -z "$deployment_tx" ]]; then
    deployment_tx=$(echo "$deploy_output" | grep -oE '0x[a-fA-F0-9]{64}' | head -1)
fi

if [[ -z "$contract_address" ]]; then
    contract_address=$(echo "$deploy_output" | grep -i "contract\|deployed" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
fi

# Verify extraction was successful
if [[ -z "$deployment_tx" ]]; then
    echo "Error: Could not extract deployment transaction hash from output"
    echo "Deploy output: $deploy_output"
    exit 1
fi

if [[ -z "$contract_address" ]]; then
    echo "Error: Could not extract contract address from output"
    echo "Deploy output: $deploy_output"
    exit 1
fi

echo "Solidity contract deployed successfully!"
echo "Transaction hash: $deployment_tx"
echo "Contract address: $contract_address"

# Output ABI for future use
echo "$contract_abi" > build/ModelVerifierABI.json
echo "ABI saved to build/ModelVerifierABI.json"

# Create build directory if it doesn't exist (redundant if already created by solcjs, but safe)
mkdir -p build

# Save deployment info to JSON file
echo "{
  \"network\": \"nitro-dev\",
  \"contract_address\": \"$contract_address\",
  \"transaction_hash\": \"$deployment_tx\",
  \"rpc_url\": \"http://127.0.0.1:8547\",
  \"deployment_time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}" > build/solidity-deployment-info.json

echo "Deployment info saved to build/solidity-deployment-info.json"

# Monitor the Nitro node
while true; do
    if ! docker ps | grep -q nitro-dev; then
        echo "Nitro node container stopped unexpectedly"
        exit 1
    fi
    sleep 5
done