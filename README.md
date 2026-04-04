# 🐬 aliyun-sls-mcp - Query Logs in Plain Language

[![Download / Open the project](https://img.shields.io/badge/Download%20%2F%20Open%20Project-blue?style=for-the-badge)](https://github.com/tovadry954/aliyun-sls-mcp)

## 🧭 What this is

aliyun-sls-mcp helps you ask for logs in plain language. It works with AI tools like Cursor and Claude, so you can search logs from services such as FC, SAE, ECS, and ACK without opening the cloud console and clicking through menus.

Use it when you want to:

- find an error in app logs
- check what happened at a certain time
- search by service name, request ID, or text
- cut down the time spent in the log console

## 💻 Before you start

Use a Windows PC with:

- Windows 10 or Windows 11
- a stable internet connection
- a web browser
- Cursor or Claude Desktop, if you want to use the tool with an AI app
- access to your Alibaba Cloud SLS logs

If you plan to use it with logs from FC, SAE, ECS, or ACK, make sure those logs already flow into SLS.

## 📥 Download

Open this page to download or get the project files:

[https://github.com/tovadry954/aliyun-sls-mcp](https://github.com/tovadry954/aliyun-sls-mcp)

If you use the project in a local setup, download the files from the page above and keep them in a folder you can find again, like `Downloads` or `Desktop`.

## 🛠️ How to set it up on Windows

### 1. Get the project files

1. Open the download link above in your browser.
2. Download the project files to your Windows PC.
3. If the files come as a ZIP file, right-click it and choose Extract All.
4. Put the folder in a simple path, such as `C:\aliyun-sls-mcp`.

### 2. Check the basic requirements

This project uses Node.js, so your PC needs it installed.

If Node.js is not on your computer:

1. Open your browser.
2. Search for Node.js for Windows.
3. Download the Windows installer.
4. Run the installer and follow the steps on screen.

If you already use Cursor or Claude Desktop, keep them ready for the next step.

### 3. Open the project folder

1. Open File Explorer.
2. Go to the folder where you saved `aliyun-sls-mcp`.
3. Open the folder.

If you see files like `package.json`, `README.md`, or `src`, you are in the right place.

### 4. Install the needed packages

Open Windows Terminal or Command Prompt in the project folder, then run:

npm install

This prepares the tool so it can run on your computer.

### 5. Start the MCP server

Run:

npm run start

If the project uses a different start command in your setup, use the command shown in the project files.

When it starts, the server waits for requests from your AI app.

## 🤖 Connect it to Cursor or Claude

### For Cursor

1. Open Cursor.
2. Go to the MCP or tool settings area.
3. Add a new MCP server entry.
4. Point it to the project folder and the start command.
5. Save the settings.
6. Restart Cursor if needed.

### For Claude Desktop

1. Open Claude Desktop.
2. Go to the settings area for tools or MCP servers.
3. Add a new server.
4. Use the local project path and start command.
5. Save and restart Claude Desktop.

After setup, the AI app can send log search requests to the server.

## 🔍 How to use it

Ask in plain language. You do not need to write queries by hand.

Examples:

- Find error logs from my FC service today
- Show logs with the text timeout in SAE
- Search ECS logs for request ID 12345
- Check ACK logs around 3 PM
- Find failed login events in SLS

The tool then helps the AI app turn your request into a log search.

## 🗂️ What it can help you do

- search logs by words in the message
- narrow results by time
- look across cloud services that send logs to SLS
- inspect errors for one app or one request
- reduce time spent on manual log checks

## 📌 Good ways to ask for logs

Use short, clear requests.

Try:

- show logs from last 10 minutes
- find error logs with 500
- search for order failed in ECS logs
- get warning logs from my service today
- show the trace for this request ID

If you know the service name, include it. If you know the time, include that too.

## 🧰 Troubleshooting

### The server does not start

Check these points:

- Node.js is installed
- you ran `npm install`
- you opened the terminal in the right folder
- the folder path has no strange characters

### Cursor or Claude cannot find the server

Check these points:

- the MCP server entry points to the right folder
- the start command is correct
- you saved the settings
- you restarted the app after changes

### No logs appear

Check these points:

- the service sends logs to Alibaba Cloud SLS
- the time range is correct
- the service name is correct
- your account can read the log store

## 🔐 Common setup items

You may need these in your local setup:

- Alibaba Cloud access key info
- SLS project name
- SLS logstore name
- region name
- service filter names for FC, SAE, ECS, or ACK

Keep these values ready before you connect the tool to your AI app.

## 🧩 Typical use cases

- A backend error appears in production, and you want the log line fast
- A request fails, and you need the request ID trace
- A service returns 500 errors, and you want the cause
- You want to check logs from FC or SAE without opening the console
- You want to use natural language instead of writing search syntax

## 📎 Project link

Open the project here:

[https://github.com/tovadry954/aliyun-sls-mcp](https://github.com/tovadry954/aliyun-sls-mcp)

## 🖥️ Windows setup at a glance

1. Download the project files from the link above
2. Extract the files if needed
3. Install Node.js
4. Open the project folder in Command Prompt
5. Run `npm install`
6. Run `npm run start`
7. Add the server to Cursor or Claude
8. Ask for logs in plain language