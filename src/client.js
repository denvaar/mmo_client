import { Socket } from 'phoenix'

class Client {
  constructor(scene) {
    this.scene = scene
    this.socket = new Socket("ws:localhost:4000/socket", {
      params: {
        token: window.userToken
      }
    })
    this.socket.connect()

    const urlParams = new URLSearchParams(window.location.search)
    const playerId = urlParams.get('player_id')
    this.clientId = playerId || "unknown"

    this.channel = this.socket.channel("room:lobby", {client_id: this.clientId})

    this.channel.on("player_joined", payload => {
      this.scene.addOtherPlayer(payload)
      console.log("New player online:", payload)
    })

    this.channel.on("player_left", payload => {
      console.log("A player has left:", payload)
      this.scene.removePlayers([payload])
    })

    this.channel.on("player_moved", payload => {
      console.log("A player moved:", payload)
      this.scene.movePlayer(payload.player_id, payload.path)
    })

    this.channel.on("spawn_player", payload => {
      console.log("spawn player", payload)
      this.scene.addPlayer(payload)
    })

    this.channel.join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp)
      })
      .receive("error", resp => { console.log("Unable to join", resp) })
  }

  movePlayer(playerId, path) {
    if (path.length > 0) {
      this.channel.push('player_moved', {
        player_id: playerId,
        path
      })
    }
  }
}

export default Client
