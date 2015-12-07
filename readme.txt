Team members
------------
Rudolf Lam (260427082)
Emil Rose (260515401)
Monica Ung (260430128)


View existing game
------------------
http://YOURIP:8080

Main HMTL file
------------------
index.html in /html

Website setup
--------------
Install node: https://nodejs.org/en/download/package-manager/

Setting up database:

Import the mysql dump file or create a new database and table with the following information:

database: cs307
table: scoreboard
mysql create statement:

CREATE TABLE scoreboard (
id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(50) not null,
score INT(10) NOT NULL
);

Change the mysql connection information in js/gameserver.js on line 10 to 13.

Setting up server IP:
Find the IP of the machine that you will use as the server.  Set the variable called OTHERIP to your server's IP in the file js/main.js on line 3.

Running the server:
In the main directory of the project, use the command: node lobby.js

Access the website with: YOUR_IP:8080