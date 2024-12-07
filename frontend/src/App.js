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
import { getFullnodeUrl, SuiClient  } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});
const rpcUrl = getFullnodeUrl('testnet');
 
// create a client connected to devnet
const client = new SuiClient({ url: rpcUrl });

const queryClient = new QueryClient();

// Winner enumeration
const Winner = {
  None: "None",
  X: "X",
  O: "O",
  You: "You",
  Them: "Them",
  Draw: "Draw",
};

function GameApp() {
  const [isConnected, setIsConnected] = useState(false);
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const [createdObjectId, setCreatedObjectId] = useState(null);
  const [gameBoard, setGameBoard] = useState(Array(3).fill(Array(3).fill(null)));
  const [currentTurn, setCurrentTurn] = useState("X");
  const [trophy, setTrophy] = useState(Winner.None);
  const [joinGameObjectId, setJoinGameObjectId] = useState("");

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
      tx.setGasBudget(10000000);

      // Define the move call to create a new game on-chain
      tx.moveCall({
        target: "0x1be6bb8e6dfd2354ea96609ce635642f9e8d419fbe6658ea116691de9bbc9009::shared::new",
        arguments: [
          tx.pure.address(account.address),  // Serialize Player X address
          tx.pure.address(account.address), // Serialize Player O address (for testing purposes, using the same address)
        ],
      });

      // Sign and execute the transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
          requestType: "WaitForLocalExecution",
          options: {
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        },
        {
          onSuccess: async (response) => {
            try {
              // Wait for the transaction to be processed
              const transaction = await client.waitForTransaction({
                digest: response.digest,
                options: {
                  showEffects: true,
                },
              });
              console.log(transaction);

              // Extract the created object ID from the transaction effects
              const createdObject = transaction.effects?.created?.[0];
              if (createdObject) {
                const objectId = createdObject.reference.objectId;
                setCreatedObjectId(objectId);
                setTrophy(Winner.None);
                console.log("Created Object ID:", objectId);
              } else {
                console.error("No objects created in this transaction.");
              }
            } catch (e) {
              console.error("Failed to retrieve transaction effects:", e);
            }
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

  // Function for player to place a mark on the board
  const makeMove = async (row, col) => {
    if (!account || !createdObjectId || trophy !== Winner.None) {
      console.error("No account connected, game not created, or game already finished");
      return;
    }

    try {
      // Create a new transaction to place a mark
      const tx = new Transaction();
      tx.setSender(account.address);
      tx.setGasBudget(10000000);

      // Define the move call to place a mark
      tx.moveCall({
        target: "0x1be6bb8e6dfd2354ea96609ce635642f9e8d419fbe6658ea116691de9bbc9009::shared::place_mark",
        arguments: [
          tx.object(createdObjectId), // The game object ID
          tx.pure.u8(row), // The row to place the mark
          tx.pure.u8(col), // The column to place the mark
        ],
      });

      // Sign and execute the transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
          requestType: "WaitForLocalExecution",
          options: {
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        },
        {
          onSuccess: async (response) => {
            try {
              // Wait for the transaction to be processed
              const transaction = await client.waitForTransaction({
                digest: response.digest,
                options: {
                  showEffects: true,
                },
              });
              console.log("Transaction successful:", transaction);

              // Update the game board state
              const newBoard = gameBoard.map((r, rowIndex) =>
                r.map((cell, colIndex) => {
                  if (rowIndex === row && colIndex === col) {
                    return currentTurn;
                  }
                  return cell;
                })
              );
              setGameBoard(newBoard);
              setCurrentTurn(currentTurn === "X" ? "O" : "X");

              // Check for a winner or draw
              const newTrophy = determineWinner(transaction);
              if (newTrophy !== Winner.None) {
                setTrophy(newTrophy);
              }

              // Console log the trophy state after each move
              console.log("Trophy State:", newTrophy);
            } catch (e) {
              console.error("Failed to retrieve transaction effects:", e);
            }
          },
          onError: (error) => {
            console.error("Failed to make a move: ", error);
          },
        }
      );
    } catch (error) {
      console.error("Failed to create a transaction: ", error);
    }
  };

  // Function to determine the winner based on transaction effects
  const determineWinner = (transaction) => {
    const effects = transaction.effects;
    if (effects?.created?.some((obj) => obj.reference.objectId)) {
      return Winner.You; // Assuming the current user won if a trophy was created
    }
    return Winner.None;
  };

  // Function to join an existing game
  const joinExistingGame = async (gameObjectId) => {
    console.log("Game Object ID type of", typeof gameObjectId); // Log the 
    console.log("Game Object ID Entered:", gameObjectId); // Log the input
    if (!account) {
      console.error("No account connected");
      return;
    }
    try {
      // Fetch the game state from the blockchain using the game object ID
      const gameState = await client.getObject({ id: gameObjectId });
      if (gameState) {
        setCreatedObjectId(gameObjectId);
        setGameBoard(gameState.data.board);
        setTrophy(Winner.None);
        console.log("Joined Game Object ID:", gameObjectId);
      } else {
        console.error("Invalid Game Object ID");
      }
    } catch (e) {
      console.error("Failed to join game:", e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="text-center">
          <p className="mb-4">Wallet Connected: {account?.address}</p>
          <button
            onClick={startNewGame}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Start New Game
          </button>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter Game Object ID to join"
              value={joinGameObjectId}
              onChange={(e) => setJoinGameObjectId(e.target.value)}
              className="border border-gray-300 px-4 py-2 mr-2"
            />
            <button
              onClick={() => joinExistingGame(joinGameObjectId)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Join Game
            </button>
          </div>
          {createdObjectId && <p>Created Game Object ID: {createdObjectId}</p>}
          {createdObjectId && (
            <div>
              <h3 className="font-bold text-lg mb-4">Game Board</h3>
              {gameBoard.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center">
                  {row.map((cell, colIndex) => (
                    <button
                      key={colIndex}
                      onClick={() => makeMove(rowIndex, colIndex)}
                      className={`w-12 h-12 m-1 border border-gray-300 ${
                        cell === "X" ? "text-blue-600" : "text-red-600"
                      } font-bold`}
                      disabled={cell !== null || trophy !== Winner.None}
                    >
                      {cell}
                    </button>
                  ))}
                </div>
              ))}
              {trophy !== Winner.None && (
                <div className="mt-4">
                  <h4 className="text-lg font-bold">
                    Winner is: {trophy === Winner.You ? "You" : "Opponent"}
                  </h4>
                  <p>Winning Player Address: {account?.address}</p>
                </div>
              )}
            </div>
          )}
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








