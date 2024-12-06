import React, { useState } from "react";
import { 
  createNetworkConfig, 
  SuiClientProvider, 
  WalletProvider, 
  useWallets, 
  useConnectWallet, 
  useSignAndExecuteTransaction,
  useCurrentAccount
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});
const queryClient = new QueryClient();

function GameApp() {
  const [isConnected, setIsConnected] = useState(false);
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();

  // Function to connect the wallet
  const connectWallet = () => {
    if (wallets.length > 0) {
      connect(
        { wallet: wallets[0] },
        {
          onSuccess: () => {
            console.log("Wallet connected successfully");
            setIsConnected(true);
          },
        }
      );
    } else {
      console.error("No wallets available to connect");
    }
  };

  // Function to create a new game on-chain
  const startNewGame = async () => {
    if (!account) {
      console.error("No account connected");
      return;
    }
    try {
      // Create a new transaction
      const tx = new Transaction();

      // Set the sender for the transaction
      tx.setSender(account.address);

      // Set a gas budget for the transaction
      tx.setGasBudget(1000000);

      // Define the move call to create a new game on-chain
      tx.moveCall({
        target: "0x1be6bb8e6dfd2354ea96609ce635642f9e8d419fbe6658ea116691de9bbc9009::tic_tac_toe::shared::new",
        arguments: [
          tx.pure.address(account.address),  // Serialize Player X address
          tx.pure.address(account.address),  // Serialize Player O address (for testing purposes, using the same address)
        ],
      });

      // Sign and execute the transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
          requestType: "WaitForLocalExecution",
        },
        {
          onSuccess: (response) => {
            console.log("New game created successfully: ", response);
          },
          onError: (error) => {
            console.error("Failed to create a new game: ", error);
          },
        }
      );
    } catch (error) {
      console.error("Failed to create a transaction: ", error);
    }
  };

  return (
    <div className="App">
      {!isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Wallet Connected: {account?.address}</p>
          <button onClick={startNewGame}>Start New Game</button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          <GameApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;

