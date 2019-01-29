import Phaser from 'phaser'
import EasyStar from 'easystarjs'

import Client from './client';


class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InventoryScene', active: true })
  }

  create() {
    let graphics = this.add.graphics()

    graphics.fillStyle(0x988078, 1)
    graphics.fillRect(1000 - 250, 0, 250, 573)

    let button = this.add.graphics()
    button.lineStyle(2, 0xffffff)
    button.strokeRect(1000 - 250, 575, 50, 25)

    const text = this.add.text(1000 - 245, 580, 'Inv.', { font: "12px Courier", fill: "#ffffff" })
    text.setInteractive()
    text.on("pointerdown", this.handleClick.bind(this))
  }

  handleClick(pointer) {
    this.scene.bringToTop()
  }
}

class StatsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StatsScene', active: true })
  }

  create() {
    let graphics = this.add.graphics()

    graphics.fillStyle(0x8a8a8a, 1)
    graphics.fillRect(1000 - 250, 0, 250, 573)
    graphics.lineStyle(2, 0xffffff)
    graphics.strokeRect(1000 - 200, 575, 50, 25)

    const text = this.add.text(1000 - 195, 580, 'Skill', { font: "12px Courier", fill: "#ffffff" })
    text.setInteractive()
    text.on("pointerdown", this.handleClick.bind(this))
  }

  handleClick(pointer) {
    this.scene.bringToTop()
  }
}

class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    // load any assets
    this.load.image('other_player', '../assets/other_player.png')
    this.load.image("tiles", "../assets/tilesets/tileset-1.png")
    this.load.tilemapTiledJSON("map", "../assets/tilemaps/world-1.json")
    this.load.atlas("atlas", "../assets/atlas/blob_sprite.png", "../assets/atlas/blob_sprite.json")
  }

  create() {
    // setup game
    this.client = new Client(this)
    this.otherPlayers = this.physics.add.group()

    const map = this.make.tilemap({ key: "map" })
    const tileset = map.addTilesetImage("tileset-1", "tiles")

    const backgroundLayer = map.createStaticLayer("ground", tileset, 0, 0)
    //const groundLayer0 = map.createStaticLayer("ground-0", tileset, 0, 0)
    //const groundLayer1 = map.createStaticLayer("ground-1", tileset, 0, 0)
    //const foregroundLayer1 = map.createStaticLayer("fg-1", tileset, 0, 0)
    //const foregroundLayer3 = map.createStaticLayer("fg-3", tileset, 0, 0)

    this.cameras.main.setBounds(0, 0, map.widthInPixels - 250, map.heightInPixels)

    this.finder = new EasyStar.js()

    let grid = []
    for (let y = 0; y < map.height; y++) {
      let col = []
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y, true, backgroundLayer)
        if (tile) col.push(tile.index);
      }
      if (col.length > 0) grid.push(col);
    }

    const acceptableTiles = []
    for (let i = tileset.firstgid - 1; i < tileset.total; i++) {
      acceptableTiles.push(i + 1)
    }

    this.finder.setGrid(grid)
    this.finder.enableDiagonals()
    this.finder.setAcceptableTiles(acceptableTiles)

    this.tilemap = map
  }

  addOtherPlayer(playerInfo) {
    const newPlayer = this.otherPlayers.create(
      playerInfo.x,
      playerInfo.y,
      'other_player'
    )
    newPlayer.playerId = playerInfo.id
  }

  removePlayers(playerInfos) {
    const otherPlayers = this.otherPlayers.getChildren()
    playerInfos.forEach(playerInfo => {
      const player = otherPlayers.find(p => p.playerId == playerInfo.player_id)
      this.otherPlayers.remove(player, true, true)
    })
  }

  addPlayer(playerInfo) {
    const player = this.physics.add
      .sprite(parseInt(playerInfo.x), parseInt(playerInfo.y), "atlas", "blob.0")
      .setSize(20, 20)
    this.cameras.main.startFollow(player)

    this.input.on("pointerdown", function(pointer) {
      const x = this.cameras.main.scrollX + this.input.x
      const y = this.cameras.main.scrollY + this.input.y
      const toX = Math.floor(x/tileSize)
      const toY = Math.floor(y/tileSize)
      const fromX = Math.floor(player.x/tileSize)
      const fromY = Math.floor(player.y/tileSize)

      const thisGame = this

      this.finder.findPath(fromX, fromY, toX, toY, function (path) {
        if (!path) {
          console.log('cannot go there')
        } else {
          let tweens = []
          for(let i = 0; i < path.length-1; i++){
            const ex = path[i+1].x;
            const ey = path[i+1].y;
            tweens.push({
              targets: player,
              x: {value: ex*thisGame.tilemap.tileWidth, duration: 200},
              y: {value: ey*thisGame.tilemap.tileHeight, duration: 200}
            });
          }
          thisGame.tweens.timeline({tweens: tweens})
          thisGame.client.movePlayer(playerInfo.id, path.map(({x, y}) => ({ x: x * tileSize, y: y * tileSize })))
        }
      })
      thisGame.finder.calculate()
    }, this)
  }

  movePlayer(playerId, path) {
    const player = this.otherPlayers.getChildren().find(p => p.playerId === playerId)
    let tweens = []
    for(let i = 0; i < path.length-1; i++){
      const ex = Math.floor(path[i+1].x / tileSize);
      const ey = Math.floor(path[i+1].y / tileSize);
      tweens.push({
        targets: player,
        x: {value: ex*this.tilemap.tileWidth, duration: 200},
        y: {value: ey*this.tilemap.tileHeight, duration: 200}
      });
    }
    this.tweens.timeline({tweens: tweens})
  }

   update(time, delta) { }
}

const tileSize = 32
const config = {
  type: Phaser.AUTO, // Which renderer to use
  width: 1000, // Canvas width in pixels
  height: 600, // Canvas height in pixels
  parent: "game-container", // ID of the DOM element to add the canvas to
  scene: [WorldScene, InventoryScene, StatsScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: true
    }
  }
}
const game = new Phaser.Game(config)
