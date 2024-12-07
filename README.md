# Tic Tac Toe on Sui: React + Sui Client Integration
Overview
This tutorial demonstrates how to use the React frontend application to interact with the Tic Tac Toe game deployed on the Sui blockchain. Players can connect wallets, create games, join existing games using an object ID, and play the game to completion.
A working version of this project can be found at [vercel] (https://tic-tac-toe-omega-dun.vercel.app/)

### Prerequisites
Sui CLI Installed: Ensure you have the Sui CLI installed and the Sui fullnode running locally or on testnet.
Node.js Installed: Ensure you have Node.js (version 16+) and npm installed for React development.
-Git Installed: Required to clone the project repository.
Features
-Connect wallets and interact with the Sui blockchain.
-Start a new Tic Tac Toe game as Player 1.
-Join an existing game as Player 2 using the game object ID.
-Display the game state dynamically from the blockchain.
-Display the winner and stop the game once a trophy is minted.
### Setup Instructions
1. Clone the Project Repository
bash
Copy code
git clone https://github.com/your-repo/tic-tac-toe.git
cd tic-tac-toe
2. Install Dependencies
bash
Copy code
npm install
3. Start the Development Server
bash
Copy code
npm start
The app will be available at http://localhost:3000.

### Step-by-Step Guide
1. Connect Wallet
Click the Connect Wallet button.
The app will connect to the first available wallet and display the connected wallet address.
2. Start a New Game (Player 1)
Click Start New Game to initialize a new game on the blockchain.
The game object ID will be displayed. Share this ID with Player 2.
3. Join a Game (Player 2)
Enter the game object ID in the input field and click Join Game.
The game state will update dynamically based on the blockchain.
4. Make a Move
Click on an empty cell to place a mark. The turn will alternate between Player X (player 1) and Player O (player 2) until a winner is determined.
The app ensures that only the correct player can make a move during their turn.
5. Display Winner
Once a player wins, a trophy object will be created signify there is a winner and the game will stop. The winner's information will be displayed.

### Design Document
#### Frontend Components
GameApp:

Handles wallet connection, game creation, joining, and moves.
Displays the game board dynamically based on blockchain state.

Game Creation:

Key Functions

1. Connect Wallet
```javascript
const connectWallet = () => {
  if (wallets.length > 0) {
    connect({ wallet: wallets[0] }, { onSuccess: () => setIsConnected(true) });
  }
};
```

2. Start New Game
```javascript
const startNewGame = async () => {
  const tx = new Transaction();
  tx.moveCall({
    target: "shared::new",
    arguments: [tx.pure.address(account.address), tx.pure.address(account.address)],
  });
  signAndExecuteTransaction({ transaction: tx });
};
```

3. Join Existing Game
```javascript
Copy code
const joinExistingGame = async (gameObjectId) => {
  const gameState = await client.getObject({ id: gameObjectId });
  setCreatedObjectId(gameObjectId);
  setGameBoard(gameState.data.board);
};
```

4. Make a Move
```javascript
Copy code
const makeMove = async (row, col) => {
  const tx = new Transaction();
  tx.moveCall({
    target: "shared::place_mark",
    arguments: [tx.object(createdObjectId), tx.pure.u8(row), tx.pure.u8(col)],
  });
  signAndExecuteTransaction({ transaction: tx });
};
```


### Deployment to Vercel
Run npm run build to generate a production build.
Deploy the build folder to Vercel via the Vercel CLI or web interface.
By following these instructions, you can set up, play, and extend the Tic Tac Toe game on the Sui blockchain with React