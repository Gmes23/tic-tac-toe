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

  // Function to test interacting with the on-chain module
  const testModuleInteraction = async () => {
    if (!account) {
      console.error("No account connected");
      return;
    }
    try {
      // Create a new transaction
      const tx = new Transaction();

      // Set the sender for the transaction
      tx.setSender(account.address);

      // Define the move call to interact with the tic-tac-toe module on-chain
      tx.moveCall({
        target: "0x1be6bb8e6dfd2354ea96609ce635642f9e8d419fbe6658ea116691de9bbc9009::tic_tac_toe::shared::new",
        arguments: [
          tx.pure(account.address),  // Player X address
          tx.pure(account.address),  // Player O address (for testing purposes, using the same address)
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
            console.log("Module interaction successful: ", response);
          },
          onError: (error) => {
            console.error("Failed to interact with module: ", error);
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
          <button onClick={testModuleInteraction}>Test Module Interaction</button>
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
