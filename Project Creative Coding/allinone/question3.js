//Phantom Patrol
//Drive a car and shoot out spirit snares to catch ghosts
//Drive the car over the spirit snares to recover them
// which increases trap reload speed and nets extra points
//Press P during gameplay to pause or end the game early
//Right and left allow the car to shift and moves the snare launch point
//Mouse will launch traps
//One loop will manage ghost movement
//One loop manages trap movement
//One loop manages ghost/trap interactions

//BIBLIOGRAPHY
//GHOST SPRITE - https://opengameart.org/content/ghost-5 - StygianChrno
//CAR SPRITES - https://opengameart.org/content/free-top-down-car-sprites-by-unlucky-studio - UnLuckyStudio
//Alleyway - https://www.freeimages.com/photo/alley-to-adelaide-str-1251523 - Freeimages.com user
//Poof, used for splitters - https://freesound.org/people/Planman/sounds/208111/ - Planman
//Sigh, used for wavestart - https://freesound.org/people/HorrorAudio/sounds/359153/ - HorrorAudio
//Cannon, used for traps - https://freesound.org/people/DeVern/sounds/517664/ - DeVern

//Normal enemies travel down the screen in a random direction and bounce off the walls
//Speed enemies travel faster down the screen
//Splitter enemies reach some point between 1/3 and 1/2 down the screen before breaking apart into two

const OPENING = 0
const MENU = 1
const GAMESETUP = 2
const GAME = 3
const LEADERBOARD = 4
const CREDITS = 5

const FRAMERATE = 45

snareSize = 80;

roadScaling = 4.5;
roadOffset = 0;

roadX = 128*roadScaling
roadY = 128*roadScaling
sidewalkX = 32*roadScaling
sidewalkY = 128*roadScaling
carSize = 128
speed = 3
speedLimit = 15;

pause = -1;
scorechanged = false;

theRoad = undefined;
//Game Object class contains the game state, enemies and the leaderboard
//Only one gameObject class is made during setup. Each new game resets the enemyArray, waveCount and enemyCount
class gameObject {
  gameState = MENU;
  enemySpeed = 5;
  enemyArray = new Group();

  //Tried to use leaderboard as a JSON object to save/write, couldn't do it.
  leaderboard = {'score': new Array(5).fill(0), 'captures': new Array(5).fill(0), 'recoveries': new Array(5).fill(0), 'Clark': new Array(5).fill(0)}

  buttonArray = new Array();
  enemyCount = 3;
  waveCount = 0;
}

//This class contains the player. Can be reset each time a game starts
class playerObject {
  //Energy limits the snare launching. If you run out of energy, no more spirit snares
  lives = 15;
  snareNeeds = 10;
  energy = 100;
  maxEnergy = 100;
  //Energy refills at a rate of 5 per second and a snare takes 10 to launch.
  energyRefillRate = 5;
  //Each snare is added to the array while being shot out
  playerShotArray = new Group();
  //Active snares are in a capturing state. Their capture time is limited to 2 seconds, growing for 1 second,
  //Stopping for half a second and then shrinking in the other half. Use life property to simulate this.
  //Every tick, life decreases. While life is greater than 1 sec, scale up the spiral. Then, while life is
  //Greater than half a second, stay. While life is greater than 0, scale down. When life is 0 or 1 tick, spawn
  //a fallen snare.
  playerCapturingArray = new Group();
  //When the snare stops capturing ghosts, it falls to the ground. It is removed from the shot array
  //And instead added to the snare array. Running over a snare recovers it and gives 0.5*snareNeeds energy.
  playerSnareArray = new Group();
  playerShotSpeed = 10;
  //X defines the x position of the car.
  speed = 0;
  score = 0;
  captures = 0;
  recoveries = 0;
}

function preload() {
  //Preload sprites and images and sound here please
  roadImage = loadImage('wholeRoad.png');
  spiralImage = loadImage('Spiral.png');
  trapstartImage = loadImage('trap1.png');
  trapdoneImage = loadImage('trap4.png');
  ghostImage = loadImage('ghost.png');
  titleImage = loadImage('Title.png');

  openingAni = loadImage('Opening.gif')
  file = loadJSON('leaderboard.json')

  poof = loadSound('208111__planman__poof-of-smoke.wav')
  sigh = loadSound('359153__horroraudio__ghostly-sigh.wav')
  cannonshot = loadSound('517664__devern__8-bit-cannon.wav')

  carAni = loadAnimation('Mini_van_L_Off.png',
    'Mini_van_L_On.png')
  trapAni = loadAnimation('trap1.png', 'trap2.png',
    'trap3.png')
}

function setup() {
  createCanvas(1200, 800);
  textAlign(CENTER, CENTER);
  imageMode(CENTER)
  angleMode(DEGREES)

  textSize(20)
  fill("Black")

  volSlider = createSlider(0, 1, 0.5, 0.01)
  volSlider.size(200)
  volSlider.position(width/2-100, 8.5*height/9)
  volSlider.hide();
  speedSlider = createSlider(3, 7, 5, 1)
  speedSlider.size(200)
  speedSlider.position(width/2 - 100, 8*height/9)
  speedSlider.hide();

  cursor('Crosshairs.png', 16, 16);
  carAni.frameDelay = 25;
  trapAni.frameDelay = 2*FRAMERATE/3;
  game = new gameObject();
  frameRate(FRAMERATE)
  //At the end of setup
  shiftStates(MENU);
  LoadLeaderboard(file);
}

function keyPressed() {
  if(keyCode == 80 && game.gameState == GAME){
    if(player.lives > 0){
      pause *= -1;
    }
  }
  if(pause == -1){
    loop();
  } else {
    for(i = 0; i < player.playerCapturingArray.length; i++){
      player.playerCapturingArray[i].setCollider("circle", 0, 0, 0);
    }
    noLoop();
  }
}

function mousePressed(){
  //Shoot traps in game
  if(game.gameState == GAME){
    if(player.lives > 0 && player.energy >= player.snareNeeds && mouseX > width - roadX - 2*sidewalkX && mouseX < width && pause != 1){
      //Use mouseX and mouseY to locate the spot where the trap should land
      distanceX = mouseX - playerCar.position.x;
      distanceY = height - mouseY;
      angle = atan(distanceY/distanceX)
      trap = createSprite(playerCar.position.x, height, 10, 10)
      trap.addAnimation("TrapAnimation", trapAni);
      trap.addImage("Shooting", trapstartImage)
      trap.changeAnimation("Shooting")
      if(distanceX >= 0){
        trap.setSpeed(player.playerShotSpeed, 360 - angle)
        trap.rotation = 90-angle;
      } else {
        trap.setSpeed(player.playerShotSpeed, 270 - (90 + angle))
        trap.rotation = 270 - angle;

      }
      trap.activation = mouseY;
      player.energy -= player.snareNeeds;
      player.playerShotArray.add(trap);
      cannonshot.play()
    }
  }
  if(game.gameState == OPENING){
    shiftStates(MENU);
  }

  //Change screen logic
  for(i = 0; i < game.buttonArray.length; i++){
    if(mouseX > game.buttonArray[i].x1 && mouseX < game.buttonArray[i].x2 && mouseY > game.buttonArray[i].y1 && mouseY < game.buttonArray[i].y2){
      shiftStates(game.buttonArray[i].func);
      loop();
      pause = -1;
    }
  }
}

//SETUP STUFF DONE
//THE FOLLOWING SECTION GETS INTO THE PARTS OF THE GAME

function makeButton(x1, y1, x2, y2, func, string, transparent){
  //This function creates a button and defines what it does when interacted with
  //Function value of MENU/1 for instance should take you to the menu screen
  game.buttonArray.push({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2, 'func': func, 'string': string, 'transparent': transparent})
  //Need to figure out how to avoid making a gajillion buttons
  //Place button creation in the shiftstates function?
}

// shiftStates changes the game state depending on what it receives.
function shiftStates(value) {
  game.buttonArray = new Array();
  if(value == MENU){
    volSlider.show();
    speedSlider.show();
  } else{
    volSlider.hide();
    speedSlider.hide();
  }
  game.gameState = value;
}

//Make ghost function
function makeGhost(ghostType, ghostX, ghostY) {
  if(ghostX == undefined || ghostY == undefined){
    phantom = createSprite(random(width - sidewalkX*0.9 - roadX + 25, width - sidewalkX*1.1 - 25), -25 - int(random(0, 26)), 50, 50);
  } else {
    phantom = createSprite(ghostX, ghostY, 50, 50);
  }
  if(ghostType == "Swift"){
    if(int(random(1, 3)) == 2){
      phantom.setSpeed(game.enemySpeed*1.5, 45+random(-5, 5));
    } else{
      phantom.setSpeed(game.enemySpeed*1.5, 135+random(-5, 5));
    }
  } else {
    if(int(random(1, 3)) == 2){
      phantom.setSpeed(game.enemySpeed, 45+random(-5, 5));
    } else{
      phantom.setSpeed(game.enemySpeed, 135+random(-5, 5));
    }
  }
  phantom.setCollider("circle", 0, 0, 10)
  phantom.debug = true;
  phantom.addImage(ghostImage);
  phantom.scale = 2;

  if(ghostType == "Splitted"){
    phantom.scale = 1.5;
    phantom.setCollider("circle", 0, 0, 7.5)
  }

  phantom.type = ghostType;

  if(ghostType == "Splitter"){
    phantom.split = random(height/3,2*height/3)
  }

  game.enemyArray.add(phantom)
}

function pickupSnare(car, snare){
  snare.remove()
  player.score += 100;
  if(player.energy < player.maxEnergy && player.energy > player.maxEnergy - player.snareNeeds/2){
    player.energy = player.maxEnergy;
  } else if (player.energy < player.maxEnergy){
    player.energy += player.snareNeeds/2;
  }
  player.recoveries++;
}

function captureGhosts(snare, ghost){
  ghost.attractionPoint(5, snare.position.x, snare.position.y-15);
  if(ghost.position.x > snare.position.x - 30 && ghost.position.x < snare.position.x + 30 && ghost.position.y > snare.position.y - 40 && ghost.position.y < snare.position.y + 30){
    if(ghost.ghostType == "Swift"){
      player.score += 300;
    } else if(ghost.ghostType == "Splitter"){
      player.score += 400;
    } else {
      player.score += 200;
    }
    player.captures++;
    ghost.remove()
  }
}

function setupGame(){
  background(25)
  game.enemyArray.removeSprites();
  player = new playerObject();
  setupRoad();
  //loadLeaderboard();
  playerCar = createSprite(width - sidewalkX - roadX/2, height - carSize/3, 0.6*carSize, 1.3*carSize);
  playerCar.setCollider("rectangle", -8, 0, 0.6*carSize, 1.3*carSize);
  playerCar.addAnimation ("carAnimation", carAni);
  playerCar.changeAnimation("carAnimation");
  playerCar.friction = 0.1;
  game.gameState = 3;
  game.enemyCount = 3;
  game.waveCount = 0;
  scorechanged = false;
}

function setupRoad(){
  roadOffset = 0;
  theRoad = createSprite(width - sidewalkX - roadX/2, 0)
  theRoad.addImage(roadImage);
  theRoad.scale = roadScaling
}

//This function draws the menu screen
function drawMenuScreen() {
  background(225);
  //Start with a flashy logo
  title = image(titleImage, width/2, height/3)
  //Start button
  makeButton(width/2 - 45, 2*height/3, width/2 + 45, 2*height/3 + 35, GAMESETUP, 'BEGIN');
  //Credits button
  makeButton(width/2 - 55, 2.5*height/3, width/2 + 55, 2.5*height/3 + 35, CREDITS, 'CREDITS');
  //Instructions
  text("Use WASD or arrow keys to control your car!\n\nUse the cursor to shoot traps at ghosts!", width/4, 2.25*height/3)
  text("Recover your traps for energy and points!\n\nSome ghosts are faster, or split!", 3*width/4, 2.25*height/3)

  text("Volume", width/2 - 140, 8.5*height/9 + 10)
  text("Enemy Speed", width/2 - 170, 8*height/9 + 10)
}

//This function draws the game screen and does the heavy lifting
//All the game's main code should be contained within here to keep draw clean
//Draw an energy meter on one side of the screen, lives in the upper corner and score in the lower corner
//Draw the highest highscore on the lower corner too, below the current score
function drawGameScreen() {
  background(25);
  //Everything that stays on the screen should be drawn here
  drawRoad();
  drawHUD();
  //Movement is relegated to the if-player.lives below so that all movement and energy regen stops when lives hits zero

  enemy = 0;
  if(player.lives > 0 && pause != 1){
    //Contains the logic that defines the road positioning
    //Contains the logic that spawns ghosts at regular intervals at random x positions at the top of the screen
    if(game.enemyArray.length == 0){
      //sigh.play()
      game.waveCount += 1;
      if(game.waveCount < 4){
        //Waves 1, 2 and 3 are normal enemies
        for(i = 0; i < game.enemyCount; i++){
          makeGhost("Normal");
        }
      } else if(game.waveCount < 7){
        game.enemyCount = game.waveCount;
        //Waves 4, 5, 6 should have speeds 1/3 of the time
        for(i = 0; i < game.enemyCount; i++){
          enemy = int(random(1, 4))
          if(enemy == 3){
            makeGhost("Swift");
          } else {
            makeGhost("Normal");
          }
        }
      } else if(game.waveCount < 10){
        //Waves 7, 8, 9 should have speeds 1/4, splitters 1/4
        for(i = 0; i < game.enemyCount; i++){
          enemy = int(random(1, 5))
          if(enemy == 4){
            makeGhost("Swift");
          } else if(enemy == 3) {
            makeGhost("Splitter");
          } else {
            makeGhost("Normal");
          }
        }
      } else if(game.waveCount < 16){
        //Waves 10>15 should have normals at 1/3, speeds at 1/3 and splitters at 1/3
        for(i = 0; i < game.enemyCount; i++){
          enemy = int(random(1, 4))
          if(enemy == 3){
            makeGhost("Swift");
          } else if(enemy == 2) {
            makeGhost("Splitter");
          } else {
            makeGhost("Normal");
          }
        }
      } else {
        //Waves 16+ should have speeds at 1/2, splitters at 1/2.
        for(i = 0; i < game.enemyCount; i++){
          enemy = int(random(1, 3))
          if(enemy == 2){
            makeGhost("Swift");
          } else {
            makeGhost("Splitter");
          }
        }
      }
    }
    //Contains the loop that checks ghosts for movement/passing the boundaries, and splitting
    for(i = 0; i < game.enemyArray.length; i++){
      //If the enemy hits the boundaries, rebound
      if(game.enemyArray[i].position.x > width-25 || game.enemyArray[i].position.x < width - 2*sidewalkX - roadX + 12){
        game.enemyArray[i].velocity.x *= -1;
        if(game.enemyArray[i].position.x > width-25){
          game.enemyArray[i].position.x = width - 26;
        } else {
          game.enemyArray[i].position.x = width - 2*sidewalkX - roadX + 11;
        }
      }
      //
      if(game.enemyArray[i].position.y < -20 && game.enemyArray[i].velocity.y < 0){
        game.enemyArray[i].velocity.y = 5;
      }
      if(game.enemyArray[i].position.y >= height + 12){
        //If enemyY > height, remove enemy, remove enemy from array, subtract from life, subtract from i and array length for next pass
        game.enemyArray[i].remove()
        player.lives--;
      }
    }

    //Splitting specific loop
    for(i = 0; i < game.enemyArray.length; i++){
      //If the enemy is a splitter, do stuff
      if( game.enemyArray[i].type == "Splitter"){
        if(game.enemyArray[i].split < game.enemyArray[i].position.y){
          poof.play()
          makeGhost("Splitted", game.enemyArray[i].position.x, game.enemyArray[i].position.y);
          makeGhost("Splitted", game.enemyArray[i].position.x, game.enemyArray[i].position.y);
          game.enemyArray[i].remove();
        }
      }
    }
    //Contains the loop that works snares
    for(i = 0; i < player.playerShotArray.length; i++){
      if(player.playerShotArray[i].activation >= player.playerShotArray[i].position.y){
        player.playerShotArray[i].setVelocity(0, 0)
        player.playerShotArray[i].activation = -100;
        player.playerShotArray[i].life = 2*FRAMERATE;
        player.playerShotArray[i].changeAnimation("TrapAnimation")
        captureZone = createSprite(player.playerShotArray[i].position.x, player.playerShotArray[i].position.y - 5)
        captureZone.addImage(spiralImage)
        captureZone.scale = 0;
        captureZone.debug = true;
        captureZone.life = 2*FRAMERATE;
        captureZone.rotation = int(random(0, 360));
        player.playerCapturingArray.add(captureZone);
      }
      if(player.playerShotArray[i].life == 1){
        fallenSnare = createSprite(player.playerShotArray[i].position.x, player.playerShotArray[i].position.y);
        fallenSnare.addImage(trapdoneImage);
        fallenSnare.rotation = player.playerShotArray[i].rotation;
        fallenSnare.setVelocity(0, 4)
        fallenSnare.setCollider("rectangle", 0, 0, 5, 5)
        fallenSnare.debug = true;
        player.playerSnareArray.add(fallenSnare)
      }
    }
    for(i = 0; i < player.playerCapturingArray.length; i++){
      if(player.playerCapturingArray[i].life > FRAMERATE){
        player.playerCapturingArray[i].setCollider("circle", 0, -10, snareSize*(100 - player.playerCapturingArray[i].life)/FRAMERATE)
        player.playerCapturingArray[i].scale += 0.1;
        player.playerCapturingArray[i].rotation -= 5;
      } else if(player.playerCapturingArray[i].life > 0.25*FRAMERATE){
        player.playerCapturingArray[i].setCollider("circle", 0, -10, 96)
        player.playerCapturingArray[i].rotation -= 5;
      } else if(player.playerCapturingArray[i].life > 1){
        player.playerCapturingArray[i].setCollider("circle", 0, -10, 96/(0.3*FRAMERATE - player.playerCapturingArray[i].life))
        player.playerCapturingArray[i].scale -= 0.2;
        player.playerCapturingArray[i].rotation -= 5;
      }
    }
    for (i = 0; i < player.playerSnareArray.length; i++){
      if(player.playerSnareArray[i].position.y > height + 10){
        player.playerSnareArray[i].remove();
      }
    }
    //Allow for mouse input and key input
    if(keyIsDown(LEFT_ARROW) || keyIsDown(65)){
      if(player.speed <= 0){
        playerCar.setVelocity(player.speed - speed, 0);
        if(player.speed > -speedLimit + speed){
          player.speed -= speed;
        } else {
          player.speed = -15;
        }
      } else {
        playerCar.setVelocity( -speed, 0);
        player.speed = -speed;
      }
    }
    if(keyIsDown(RIGHT_ARROW) || keyIsDown(68)){
      if(player.speed >= 0){
        playerCar.setVelocity(player.speed + speed, 0);
        if(player.speed < speedLimit - speed){
          player.speed += speed;
        } else {
          player.speed = 15;
        }
      } else {
        playerCar.setVelocity(speed, 0);
        player.speed = speed;
      }
    }
    if(keyIsDown(RIGHT_ARROW) && keyIsDown(LEFT_ARROW)){
      playerCar.setVelocity(0, 0)
    }
    //Car Rotation
    if(player.speed < 0){
      playerCar.rotation = 90 - 45*(1/1+Math.pow(2.718, playerCar.getSpeed()/75))
    } else {
      playerCar.rotation = 270 + 45*(1/1+Math.pow(2.718, playerCar.getSpeed()/75))
    }
    //Energy Refill
    if(frameCount % FRAMERATE == 0 && player.energy <= player.maxEnergy - player.energyRefillRate){
      player.energy += player.energyRefillRate;
    } else if (player.energy < player.maxEnergy && player.energy > player.maxEnergy - player.energyRefillRate){
      player.energy = player.maxEnergy;
    }
  } else if (player.lives < 1 && pause != 1){
    //Game over procedure
    playerCar.friction = 0.25;
    for(i = 0; i < player.playerShotArray.length; i++){
      player.playerShotArray[i].setVelocity(0, 0)
      player.playerShotArray[i].life = -1;
    }
    for(i = 0; i < player.playerSnareArray.length; i++){
      player.playerSnareArray[i].setVelocity(0, 0)
      player.playerSnareArray[i].life = -1;
    }
    for(i = 0; i < player.playerCapturingArray.length; i++){
      player.playerCapturingArray[i].life = -1;
    }
    game.enemyArray.removeSprites()
    for(i = 0; i < 5; i++){
      if(player.score > game.leaderboard.score[i] && !scorechanged){
        game.leaderboard.score.splice(i, 0, player.score)
        game.leaderboard.score.pop()
        game.leaderboard.captures.splice(i, 0, player.captures)
        game.leaderboard.captures.pop()
        game.leaderboard.recoveries.splice(i, 0, player.recoveries)
        game.leaderboard.recoveries.pop()
        game.leaderboard.Clark.splice(i, 0, false);
        game.leaderboard.Clark.pop()
        scorechanged = true;
      }
      //saveLeaderboard();
    }
    if(game.buttonArray.length == 1){
      makeButton(0, 0, width, height, LEADERBOARD, "", true)
    }
  }

  //Side wall collision
  if(playerCar.position.x > width - playerCar.collider.extents.x/2 + 20){
    playerCar.position.x = width - playerCar.collider.extents.x/2 + 19;
    playerCar.setVelocity(0, 0)
  }
  if(playerCar.position.x < width - 2*sidewalkX - roadX + playerCar.collider.extents.x/2 - 5){
    playerCar.position.x = width - 2*sidewalkX - roadX + playerCar.collider.extents.x/2 - 4;
    playerCar.setVelocity(0, 0)
  }

  //Capture Ghosts!
  player.playerCapturingArray.overlap(game.enemyArray, captureGhosts)
}

//Going to add in extra functions to break down the game screen and make it simpler
//Add road and scoreboard+lives+energy seperately
function drawRoad(){
  if(player.lives > 0){
    //Contains the code that moves up the road and generates new road
    theRoad.position.y += 4;
    roadOffset += 4;
    if(roadOffset == 572){
      theRoad.position.y = 0;
      roadOffset = 0;
    }
  }
}

function drawHUD(){
  //Contains the code that draws up the display
  fill("Yellow")
  rect(118, 120, 100, 500, 25);
  fill("Black");
  rect(128, 130, 80, 480, 25);
  fill("Green");
  rect(128, 610, 80,  -480*(player.energy/100), 25);
  fill("White");
  text(`${player.energy}/${player.maxEnergy}`, 168, 100);
  text(`LIVES: ${player.lives}     SCORE: ${player.score}`, 168, 640);
  text(`BEST HIGHSCORE: ${game.leaderboard.score[0]}`, 168, 660);
  fill("Black")
  logo = image(titleImage, 168, height -  60, 196, 83)
  if(game.buttonArray.length == 0){
    makeButton(118, 20, 218, 50, MENU, "BACK")
  }
}

function drawLeaderboard() {
  //Contains a loop that draws the top 5 highscores
  player.playerCapturingArray.removeSprites()
  player.playerShotArray.removeSprites()
  player.playerSnareArray.removeSprites()
  playerCar.remove()
  background(225)
  for(i = 0; i < 5; i++){
    score = '00000000'
    if(str(game.leaderboard.score[i]).length < score.length){
      score = score.slice(0, score.length - str(game.leaderboard.score[i]).length) + str(game.leaderboard.score[i])
    }
    if(game.leaderboard.Clark[i] == true){
      text(`☆No ${i+1}; ${score}, captures; ${game.leaderboard.captures[i]}, recoveries: ${game.leaderboard.recoveries[i]}`, width/2, height*(i+1)/8)
    } else {
      text(`No ${i+1}; ${score}, captures; ${game.leaderboard.captures[i]}, recoveries: ${game.leaderboard.recoveries[i]}`, width/2, height*(i+1)/8)
    }
  }
  if(game.buttonArray.length == 0){
    makeButton(width/3 - 70, 7*height/8, width/3 + 70, 7*height/8 + 30, GAMESETUP, "PLAY AGAIN")
    makeButton(2*width/3 - 50, 7*height/8, 2*width/3 + 50, 7*height/8 + 30, MENU, "RETURN")
  }
}

//GHOST SPRITE - https://opengameart.org/content/ghost-5 - StygianChrno
//CAR SPRITES - https://opengameart.org/content/free-top-down-car-sprites-by-unlucky-studio - UnLuckyStudio
//Alleyway - https://www.freeimages.com/photo/alley-to-adelaide-str-1251523 - Freeimages.com user
//Poof, for splitters - https://freesound.org/people/Planman/sounds/208111/ - Planman
//Sigh, for wave start - https://freesound.org/people/HorrorAudio/sounds/359153/ - HorrorAudio
//Cannon, for traps - https://freesound.org/people/DeVern/sounds/517664/ - DeVern

function drawCreditsScreen() {
  //Credits
  background(225)

  text("Ghost Sprite - https://opengameart.org/content/ghost-5 - StygianChrno\nCar Sprite - https://opengameart.org/content/free-top-down-car-sprites-by-unlucky-studio - UnLuckyStudio\n", width/2, height/8);
  text("Alleyway - https://www.freeimages.com/photo/alley-to-adelaide-str-1251523- Freeimages.com user\nPoof, for splitters - https://freesound.org/people/Planman/sounds/208111/ - Planman", width/2, 2*height/8);
  text("Sigh, for wave start - https://freesound.org/people/HorrorAudio/sounds/359153/ - HorrorAudio\nCannon, for traps - https://freesound.org/people/DeVern/sounds/517664/ - DeVern", width/2, 3*height/8);
  text("Inspiration was taken from the 1984 film, Ghostbusters directed and produced\nby Ivan Reitman and written by Dan Aykroyd and Harold Ramis.", width/2, 4*height/8)
  text("This game was made for my Griffith Uni Creative Coding course, in 2021", width/2, 7*height/8);

  if(game.buttonArray.length == 0){
    makeButton(width/2 - 50, 2*height/3, width/2 + 50, 2*height/3 + 25, MENU, 'RETURN');
  }
}

function drawButtons(){
  for(i = 0; i < game.buttonArray.length; i++){
    if(game.buttonArray[i].transparent != undefined){
      noFill();
      noStroke();
      quad(game.buttonArray[i].x1, game.buttonArray[i].y1, game.buttonArray[i].x1, game.buttonArray[i].y2, game.buttonArray[i].x2, game.buttonArray[i].y2, game.buttonArray[i].x2, game.buttonArray[i].y1);
      fill("Black");
      stroke("Black");
      text(game.buttonArray[i].string, game.buttonArray[i].x1 + (game.buttonArray[i].x2 - game.buttonArray[i].x1)/2, game.buttonArray[i].y1 + (game.buttonArray[i].y2-game.buttonArray[i].y1)/2);
    } else {
      fill("Red");
      noStroke();
      quad(game.buttonArray[i].x1, game.buttonArray[i].y1, game.buttonArray[i].x1, game.buttonArray[i].y2, game.buttonArray[i].x2, game.buttonArray[i].y2, game.buttonArray[i].x2, game.buttonArray[i].y1);
      fill("Black");
      stroke("Black")
      text(game.buttonArray[i].string, game.buttonArray[i].x1 + (game.buttonArray[i].x2-game.buttonArray[i].x1)/2, game.buttonArray[i].y1 + (game.buttonArray[i].y2-game.buttonArray[i].y1)/2);
    }
  }
}

function draw() {
  if(game.gameState == 0){
    drawOpeningScreen();
  } else if(game.gameState == 1) {
    drawMenuScreen();
    sigh.setVolume(volSlider.value())
    poof.setVolume(volSlider.value())
    cannonshot.setVolume(volSlider.value())
    game.enemySpeed = speedSlider.value()
  } else if(game.gameState == 2){
    setupGame();
  } else if(game.gameState == 3) {
    drawGameScreen();
    drawSprites();
    drawSprite(playerCar);
    drawSprites(player.playerShotArray)
    drawSprites(player.playerSnareArray)
    drawSprites(player.playerCapturingArray)
    if(pause == 1){
      textSize(90);
      text("PAUSED", width - sidewalkX - roadX/2, height/2);
      textSize(20);
    }
    if(player.lives < 1){
      textSize(90)
      fill("White")
      stroke("Black")
      text('GAME OVER\nCLICK ANYWHERE\nTO CONTINUE', width - sidewalkX - roadX/2, height/2);
      textSize(20)
    }
    playerCar.overlap(player.playerSnareArray, pickupSnare)
  } else if(game.gameState == 4){
    drawLeaderboard();
  } else if (game.gameState == 5){
    drawCreditsScreen();
  }
  drawButtons();
}

function drawOpeningScreen(){
  image(openingAni, width/2 - 50, height/2 + 50, height + 100, height + 100)
  if (frameCount > 5.25*FRAMERATE) {
    shiftStates(MENU)
  }
}

function LoadLeaderboard(JSONfile){
  for(i = 0; i < 5; i++){
    game.leaderboard.score[i] = JSONfile.score[i];
    game.leaderboard.captures[i] = JSONfile.captures[i];
    game.leaderboard.recoveries[i] = JSONfile.recoveries[i];
    game.leaderboard.Clark[i] = true;
  }
}
