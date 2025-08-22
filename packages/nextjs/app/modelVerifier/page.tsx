"use client";

import { useEffect, useState } from "react";
import { buildPoseidon } from "circomlibjs";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";


export default function ModelVerifier() {
  const [w, setW] = useState("");
  const [b, setB] = useState("");
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [H, setH] = useState("");
  const [isCommitmentGenerated, setIsCommitmentGenerated] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [proof, setProof] = useState<any>(null);

  // Replace with your deployed contract address
  const CONTRACT_ADDRESS = "0xD47D03D6e8a24C050d7ef26Ef39100ceAc42E736";
  const CONTRACT_ABI = [
    {
      inputs: [
        {
          internalType: "uint256[2]",
          name: "_pA",
          type: "uint256[2]",
        },
        {
          internalType: "uint256[2][2]",
          name: "_pB",
          type: "uint256[2][2]",
        },
        {
          internalType: "uint256[2]",
          name: "_pC",
          type: "uint256[2]",
        },
        {
          internalType: "uint256[3]",
          name: "_pubSignals",
          type: "uint256[3]",
        },
      ],
      name: "verifyProof",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  useEffect(() => {
    const loadContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "");
        const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || "";
        const newSigner = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
        setContract(contract);
      } catch (err: any) {
        setError(err.message);
        console.error("Contract loading error:", err);
      }
    };

    loadContract();
  }, []);

  const calculateCommitment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      if (!w || !b) {
        throw new Error("Slope (w) and Intercept (b) are required");
      }

      // Get Poseidon hash function
      const poseidon = await buildPoseidon();

      // Calculate the commitment hash H = Poseidon(w, b)
      const hash = poseidon.F.toString(poseidon([BigInt(Number(w)), BigInt(Number(b))]));

      // Set the calculated hash
      setH(hash);
      setIsCommitmentGenerated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetCommitment = () => {
    setIsCommitmentGenerated(false);
    setH("");
    setVerificationResult(null);
    setProof(null);
  };

  const verifyModel = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      if (!w || !b || !x || !y || !H) {
        throw new Error("All fields are required");
      }

      // Check if contract is initialized
      if (!contract) {
        throw new Error("Contract is not initialized");
      }

      // Generate the proof
      const { proof, publicSignals } = await groth16.fullProve(
        { w: Number(w), b: Number(b), x: Number(x), y: Number(y), H },
        "/ModelVerifier.wasm",
        "/ModelVerifier_final.zkey",
      );

      // Set the proof in state
      setProof(proof);

      // Export calldata for the contract
      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      const args = JSON.parse(`[${calldata}]`);

      // Call the contract's verifyProof function
      const result = await contract.verifyProof(args[0], args[1], args[2], args[3]);

      setVerificationResult(result);
    } catch (err: any) {
      // Check for specific error messages and set user-friendly messages
      if (err.message.includes("Assert Failed")) {
        setError("The provided output (y) does not match the expected value based on the inputs.");
      } else {
        setError("An unexpected error occurred during verification.");
      }
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-700">Model Verifier</h1>

        {/* Input fields for w, b, x, y, H */}
        <div className="mb-4">
          <input
            type="text"
            value={w}
            onChange={e => {
              setW(e.target.value);
              if (isCommitmentGenerated) resetCommitment();
            }}
            placeholder="Slope (w)"
            className="w-full p-2 border rounded-md mb-2"
          />
          <input
            type="text"
            value={b}
            onChange={e => {
              setB(e.target.value);
              if (isCommitmentGenerated) resetCommitment();
            }}
            placeholder="Intercept (b)"
            className="w-full p-2 border rounded-md mb-2"
          />

          {/* First step: Generate commitment button */}
          {!isCommitmentGenerated && (
            <button
              onClick={calculateCommitment}
              disabled={loading || !w || !b}
              className="w-full p-2 bg-green-500 text-white rounded-md mb-4"
            >
              {loading ? "Calculating..." : "Generate Commitment Hash"}
            </button>
          )}

          {/* Once commitment is generated, show it in a disabled input */}
          {isCommitmentGenerated && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="text"
                  value={H}
                  readOnly
                  placeholder="Commitment Hash (H)"
                  className="w-full p-2 border rounded-md bg-gray-100 text-black"
                />
                <button onClick={resetCommitment} className="ml-2 p-2 bg-gray-300 text-gray-700 rounded-md">
                  Reset
                </button>
              </div>
              <p className="text-sm text-gray-500">This is the commitment hash generated from your model parameters.</p>
            </div>
          )}

          {/* Only show these inputs after commitment is generated */}
          {isCommitmentGenerated && (
            <>
              <input
                type="text"
                value={x}
                onChange={e => setX(e.target.value)}
                placeholder="Input (x)"
                className="w-full p-2 border rounded-md mb-2"
              />
              <input
                type="text"
                value={y}
                onChange={e => setY(e.target.value)}
                placeholder="Output (y)"
                className="w-full p-2 border rounded-md mb-4"
              />

              <button
                onClick={verifyModel}
                disabled={loading || !x || !y}
                className="w-full p-2 bg-blue-500 text-white rounded-md"
              >
                {loading ? "Verifying..." : "Verify Model"}
              </button>
            </>
          )}
        </div>

        {error && <div className="mt-4 p-3 rounded-md bg-red-100 text-red-700">{error}</div>}
        {verificationResult !== null && (
          <div
            className={`mt-4 p-3 rounded-md ${verificationResult ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {verificationResult ? "Verified: Model is valid!" : "Verification failed: Invalid model!"}
          </div>
        )}

        {proof && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">Proof:</h2>
            <pre className="bg-gray-100 text-gray-700 p-2 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(proof, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}