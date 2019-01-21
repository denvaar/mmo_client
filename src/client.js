import { Socket, Presence } from 'phoenix'

class Client {
  constructor(scene) {
    this.scene = scene
    this.socket = new Socket("ws:localhost:4000/socket", {
      params: {
        token: window.userToken
      }
    })
    this.socket.connect()
    this.clientId = Math.floor(Math.random() * 1000)
    this.channel = this.socket.channel("room:lobby", {client_id: this.clientId})

    this.presences = {}
    this.channel.on("presence_state", state => {
      this.presences = Presence.syncState(this.presences, state)
      const existingPlayers = Presence.list(this.presences,
        (_id, {metas: [user, ...rest]}) => user)
      this.scene.addOtherPlayers(existingPlayers)
    })

    this.channel.on("presence_diff", diff => {
      this.presences = Presence.syncDiff(this.presences, diff)
      if (Object.keys(diff.joins).length > 0) this.handleJoins(diff.joins)
      if (Object.keys(diff.leaves).length > 0) this.handleLeaves(diff.leaves)
    })

    this.channel.on("player_moved", payload => {
      this.scene.movePlayer(payload.player_id, payload.path)
    })

    this.channel.join()
      .receive("ok", resp => { console.log("Joined successfully", resp) })
      .receive("error", resp => { console.log("Unable to join", resp) })
  }

  handleJoins(joins) {
    if (joins[`player:${this.clientId}`]) {
      this.scene.addPlayer(joins[`player:${this.clientId}`].metas[0])
    }

    let otherPlayerKeys = Object.keys(joins)
      .filter(k => k !== `player:${this.clientId}`)

    let otherPlayers = otherPlayerKeys.map(key => {
      return joins[key].metas[0]
    })

    if (otherPlayers.length > 0) this.scene.addOtherPlayers(otherPlayers)
  }

  handleLeaves(leaves) {
    let otherPlayerKeys = Object.keys(leaves)
      .filter(k => k !== `player:${this.clientId}`)
    let otherPlayers = otherPlayerKeys.map(key => {
      return leaves[key].metas[0]
    })

    this.scene.removePlayers(otherPlayers)
  }

  movePlayer(playerId, path) {
    this.channel.push('player:move', {
      player_id: playerId,
      path
    })
  }
}

export default Client
