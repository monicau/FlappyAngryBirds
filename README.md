# Angry Flappy Birds!

Built by Rudolf Lam, Emil Rose & Monica Ung 

##View game

View online working example: http://159.203.5.238:8080/

Your own setup: http://YOURIP:8080

##Main HMTL file
index.html in /html

##Website setup
Install node: https://nodejs.org/en/download/package-manager/

###Setting up database

Import the mysql dump file or create a new database and table with the following information:

*database*: cs307

*table*: scoreboard

Mysql create statement:

```CREATE TABLE scoreboard (
id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(50) not null,
score INT(10) NOT NULL
);```

Change the mysql connection information in js/gameserver.js on line 10 to 13.

###Setting up server IP
Find the IP of the machine that you will use as the server.  Set the variable called OTHERIP to your server's IP in the file js/main.js on line 3.

###Running the server

In the main directory of the project, use the command: ```node lobby.js```

Access the website with: http://YOUR_IP:8080

## Project presentation

https://github.com/monicau/FlappyAngryBirds/blob/master/presentation.pdf
