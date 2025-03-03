// Podstawowy prototyp mechaniki gry Metin2D w Phaser.js
// Ten kod prezentuje prostą scenę z graczem i podstawowymi interakcjami

import Phaser from 'phaser';

// Konfiguracja gry
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// Inicjalizacja gry
const game = new Phaser.Game(config);

// Zmienne globalne
let player;
let cursors;
let metin;
let enemies;
let attackButton;
let skillButton;
let attackActive = false;
let skillActive = false;
let playerStats = {
  level: 1,
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  attack: 10,
  defense: 5,
  experience: 0,
  nextLevel: 100
};

let healthBar;
let manaBar;
let expBar;

// Załadowanie zasobów
function preload() {
  // Ładowanie grafik (w prawdziwej grze byłyby to oryginalne assety)
  this.load.image('background', 'assets/background.png');
  this.load.spritesheet('player', 'assets/player.png', { frameWidth: 64, frameHeight: 64 });
  this.load.spritesheet('enemy', 'assets/enemy.png', { frameWidth: 64, frameHeight: 64 });
  this.load.image('metin', 'assets/metin.png');
  this.load.image('attack', 'assets/attack.png');
  this.load.image('ui-background', 'assets/ui-background.png');
}

// Tworzenie sceny
function create() {
  // Tło
  this.add.image(400, 300, 'background');
  
  // UI
  createUI.call(this);
  
  // Gracz
  player = this.physics.add.sprite(400, 300, 'player');
  player.setCollideWorldBounds(true);
  
  // Kamień Metin
  metin = this.physics.add.sprite(600, 200, 'metin');
  metin.setScale(1.5);
  metin.health = 100;
  
  // Przeciwnicy
  enemies = this.physics.add.group();
  createEnemy(this, 200, 200);
  createEnemy(this, 700, 400);
  
  // Kolizje
  this.physics.add.collider(player, enemies);
  this.physics.add.collider(player, metin);
  this.physics.add.collider(enemies, enemies);
  
  // Interakcje
  this.physics.add.overlap(player, enemies, attackEnemy, checkAttackActive, this);
  this.physics.add.overlap(player, metin, attackMetin, checkAttackActive, this);
  
  // Animacje
  createAnimations.call(this);
  
  // Sterowanie
  cursors = this.input.keyboard.createCursorKeys();
  attackButton = this.input.keyboard.addKey('A');
  skillButton = this.input.keyboard.addKey('S');
  
  // Instrukcje
  this.add.text(20, 20, 'Strzałki - ruch, A - atak, S - umiejętność', { fontSize: '16px', fill: '#fff' });
}

// Aktualizacja co klatkę
function update() {
  // Ruch gracza
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('left', true);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('right', true);
  } else {
    player.setVelocityX(0);
  }

  if (cursors.up.isDown) {
    player.setVelocityY(-160);
    if (!cursors.left.isDown && !cursors.right.isDown) {
      player.anims.play('up', true);
    }
  } else if (cursors.down.isDown) {
    player.setVelocityY(160);
    if (!cursors.left.isDown && !cursors.right.isDown) {
      player.anims.play('down', true);
    }
  } else {
    player.setVelocityY(0);
  }
  
  // Zatrzymanie animacji, gdy gracz stoi
  if (player.body.velocity.x === 0 && player.body.velocity.y === 0 && !attackActive && !skillActive) {
    player.anims.play('idle');
  }
  
  // Atak
  if (Phaser.Input.Keyboard.JustDown(attackButton)) {
    attackActive = true;
    player.anims.play('attack');
    this.time.delayedCall(500, () => { attackActive = false; });
  }
  
  // Umiejętność
  if (Phaser.Input.Keyboard.JustDown(skillButton) && playerStats.mana >= 10) {
    skillActive = true;
    player.anims.play('skill');
    playerStats.mana -= 10;
    updateBars();
    
    // Efekt umiejętności (obszarowy atak)
    const skillRange = 150;
    enemies.getChildren().forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (distance < skillRange) {
        enemy.health -= playerStats.attack * 1.5;
        if (enemy.health <= 0) {
          enemy.destroy();
          gainExperience(30);
        }
      }
    });
    
    this.time.delayedCall(800, () => { skillActive = false; });
  }
  
  // Regeneracja many
  if (playerStats.mana < playerStats.maxMana && this.time.now % 60 === 0) {
    playerStats.mana += 0.1;
    updateBars();
  }
  
  // Aktualizacja przeciwników
  enemies.getChildren().forEach(enemy => {
    moveEnemyTowardsPlayer(enemy, player);
  });
}

// Funkcje pomocnicze

function createUI() {
  // Tło UI
  this.add.image(400, 550, 'ui-background').setScale(2, 0.5);
  
  // Paski
  healthBar = this.add.rectangle(150, 550, 200, 20, 0xff0000);
  manaBar = this.add.rectangle(150, 580, 200, 20, 0x0000ff);
  expBar = this.add.rectangle(500, 550, 300, 20, 0x00ff00);
  expBar.scaleX = 0;
  
  // Etykiety
  this.add.text(50, 542, 'HP:', { fontSize: '16px', fill: '#fff' });
  this.add.text(50, 572, 'MP:', { fontSize: '16px', fill: '#fff' });
  this.add.text(400, 542, 'EXP:', { fontSize: '16px', fill: '#fff' });
  
  // Informacje o poziomie
  this.add.text(400, 580, 'Poziom: 1', { fontSize: '16px', fill: '#fff' })
    .setName('levelText');
}

function updateBars() {
  // Aktualizacja pasków zdrowia, many i doświadczenia
  healthBar.scaleX = playerStats.health / playerStats.maxHealth;
  manaBar.scaleX = playerStats.mana / playerStats.maxMana;
  expBar.scaleX = playerStats.experience / playerStats.nextLevel;
  
  // Aktualizacja tekstu poziomu
  const levelText = game.scene.scenes[0].children.getByName('levelText');
  if (levelText) {
    levelText.setText(`Poziom: ${playerStats.level}`);
  }
}

function createAnimations() {
  // Animacje gracza
  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'up',
    frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'down',
    frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
    frameRate: 10,
    repeat: -1
  });
  
  this.anims.create({
    key: 'idle',
    frames: [ { key: 'player', frame: 12 } ],
    frameRate: 10
  });
  
  this.anims.create({
    key: 'attack',
    frames: this.anims.generateFrameNumbers('player', { start: 16, end: 19 }),
    frameRate: 10
  });
  
  this.anims.create({
    key: 'skill',
    frames: this.anims.generateFrameNumbers('player', { start: 20, end: 23 }),
    frameRate: 10
  });
  
  // Animacje przeciwnika
  this.anims.create({
    key: 'enemy-move',
    frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
    frameRate: 7,
    repeat: -1
  });
}

function createEnemy(scene, x, y) {
  const enemy = enemies.create(x, y, 'enemy');
  enemy.health = 30;
  enemy.anims.play('enemy-move', true);
  return enemy;
}

function moveEnemyTowardsPlayer(enemy, player) {
  // Proste AI - przeciwnicy podążają za graczem
  const speed = 60;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const angle = Math.atan2(dy, dx);
  
  enemy.setVelocityX(Math.cos(angle) * speed);
  enemy.setVelocityY(Math.sin(angle) * speed);
}

function attackEnemy(player, enemy) {
  if (attackActive) {
    enemy.health -= playerStats.attack;
    
    // Efekt odrzucenia
    const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    enemy.setVelocityX(Math.cos(angle) * 300);
    enemy.setVelocityY(Math.sin(angle) * 300);
    
    // Sprawdzenie, czy przeciwnik został pokonany
    if (enemy.health <= 0) {
      enemy.destroy();
      gainExperience(20);
    }
  }
}

function attackMetin(player, metin) {
  if (attackActive) {
    metin.health -= playerStats.attack;
    
    // Sprawdzenie, czy Metin został zniszczony
    if (metin.health <= 0) {
      metin.destroy();
      gainExperience(100);
      
      // Losowe nagrody po zniszczeniu Metina
      spawnRewards(metin.x, metin.y);
    }
  }
}

function spawnRewards(x, y) {
  // W pełnej implementacji tutaj pojawiałyby się przedmioty, złoto itp.
  console.log("Metin zniszczony - nagrody przyznane!");
}

function checkAttackActive() {
  return attackActive;
}

function gainExperience(amount) {
  playerStats.experience += amount;
  
  // Awans na wyższy poziom
  if (playerStats.experience >= playerStats.nextLevel) {
    playerStats.level++;
    playerStats.experience -= playerStats.nextLevel;
    playerStats.nextLevel = Math.floor(playerStats.nextLevel * 1.5);
    
    // Zwiększenie statystyk
    playerStats.maxHealth += 20;
    playerStats.health = playerStats.maxHealth;
    playerStats.maxMana += 10;
    playerStats.mana = playerStats.maxMana;
    playerStats.attack += 5;
    playerStats.defense += 3;
  }
  
  updateBars();
}

// Eksport (w przypadku modularnego kodu)
export default game;