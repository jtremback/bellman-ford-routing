const ui = require('./ui.js')

const tm = 1000

let infinityJSON = {
  parse (json, _) {
    return JSON.parse(
      json,
      function (key, value) {
        if (value === 'Infinity') {
          return Infinity;
        }
        return value;
      }
    )
  },
  stringify (json, _, spacing) {
    return JSON.stringify(
      json,
      function (key, value) {
        if (value === Infinity) {
          return 'Infinity';
        }
        return value;
      },
      spacing
    )
  }
}



// Example from section 2.4
// No routing loop should form after 4 seconds

//       B
//   1 1/|
// S---A |1
//     1\|
//       C

//       B
//   ∞ 1/|
// S---A |1
//     1\|
//       C

let network = {
  nodes: {
    S: {},
    A: {},
    B: {},
    C: {}
  },
  edges: {
    'S->A': { cost: 1 },
    'A->S': { cost: 1 },

    'B->A': { cost: 1 },
    'A->B': { cost: 1 },

    'B->C': { cost: 1 },
    'C->B': { cost: 1 },

    'C->A': { cost: 1 },
    'A->C': { cost: 1 },
  }
}

setTimeout(() => {
  debugger
  network.edges['S->A'].cost = Infinity
  network.edges['A->S'].cost = Infinity
  ui.updateNetwork(network)
}, 4 * tm)


// Can we select the better route?

// //   A--B
// // 1/  1 \1
// // S      D
// // 1\   5/
// //   C--/

// //   A--B
// // 1/  1 \1
// // S      D
// // 1\   1/
// //   C--/

// let network = {
//   nodes: {
//     S: {},
//     A: {},
//     B: {},
//     C: {},
//     D: {}
//   },
//   edges: {
//     'S->A': { cost: 1 },
//     'A->S': { cost: 1 },

//     'A->B': { cost: 1 },
//     'B->A': { cost: 1 },

//     'B->D': { cost: 1 },
//     'D->B': { cost: 1 },

//     'S->C': { cost: 1 },
//     'C->S': { cost: 1 },

//     'C->D': { cost: 50 },
//     'D->C': { cost: 50 },
//   }
// }

// setTimeout(() => {
//   console.log('changed cost of c-d')
//   network.edges['C->D'].cost = 1
//   network.edges['D->C'].cost = 1
//   ui.updateNetwork(network)
// }, 4 * tm)



// Section 2.5: spurious starvation

// 1 --A
//  /  |
// S   | 1
//  \  |
// 1 --B

// ∞ --A
//  /  |
// S   | 1
//  \  |
// 1 --B

// let network = {
//   nodes: {
//     S: {},
//     A: {},
//     B: {}
//   },
//   edges: {
//     'S->A': { cost: 1 },
//     'A->S': { cost: 1 },

//     'B->A': { cost: 1 },
//     'A->B': { cost: 1 },

//     'S->B': { cost: 2 },
//     'B->S': { cost: 2 },
//   }
// }

// setTimeout(() => {
//   debugger
//   network.edges['S->A'].cost = Infinity
//   network.edges['A->S'].cost = Infinity
//   ui.updateNetwork(network)
// }, 4 * tm)



function initNodes (network) {
  for (let nodeId in network.nodes) {
    let node = network.nodes[nodeId]

    node.id = nodeId
    node.sources = {
      [nodeId]: {
        cost: 0,
        nextHop: nodeId
      }
    }

    node.neighbors = {}
  }

  for (let edgeId in network.edges) {
    let [nodeIdA, nodeIdB] = edgeId.split('->')

    network.nodes[nodeIdA].neighbors[nodeIdB] = network.nodes[nodeIdB]
  }
}

function feasibilityCondition (self, from, update, source) {
  // if (update.cost === Infinity) {debugger}
  // Don't accept updates for yourself
  if (update.id === self.id) {
    return false

  // If a route for this destination does not yet exist, accept it.
  } else if (!source) {
    console.log('!source')
    return true

  // If it is an adjustment to the currently selected route
  } else if (from.id === source.nextHop) {
    console.log('from.id === source.id')
    return true

  // If the edge to the neighbor is lower cost than the smallest metric that
  // we have ever advertised to our neighbors
  // (D(B) < FD(A) from section 2.4)
  } else if (update.cost < source.fd) {
    console.log('update.cost < source.fd')
    return true

  } else {
    return false
  }
}

function receiveUpdate (self, from, updates) {
  updates = infinityJSON.parse(updates)

  // Get cost of edge from network spec
  // (Simulates hello and IHU from section 3.4.3)
  let edge = network.edges[self.id + '->' + from.id]
  let edgeCost = (edge && edge.cost) || 0

  for (let update of updates) {
    // If feasibility condition is true, accept update
    if (feasibilityCondition(self, from, update, self.sources[update.id])) {

      // If the source does not exist, make a new one
      if (!self.sources[update.id]) {
        self.sources[update.id] = { cost: update.cost + edgeCost, nextHop: from.id, fd: Infinity }

      // Otherwise, modify in place
      } else {
        self.sources[update.id].cost = update.cost + edgeCost
        self.sources[update.id].nextHop = from.id
      }

      ui.log(`${self.id} accepted update ${infinityJSON.stringify(update)} from ${from.id} to source ${JSON.stringify(self.sources[update.id])}`)
      ui.updateNetwork(network)

    // Reject update
    } else {
      ui.log(`${self.id} rejected update ${infinityJSON.stringify(update)} from ${from.id}`)
    }
  }
}

function transmit (neighbor, self, sources) {
  // Check if edge cost is infinity
  if (network.edges[self.id + '->' + neighbor.id].cost === Infinity) {
    throw new Error()
  }

  setTimeout(() => {
    receiveUpdate(neighbor, self, infinityJSON.stringify(sources))
  }, Math.random() * 0.1 * tm)
}

function sendPeriodicUpdate (self) {
  let updates = []

  for (let sourceId in self.sources) {
    let source = self.sources[sourceId]

    // Stores feasibility condition
    // (FD(A) from section 2.4)
    if (source.cost < source.fd) {
      source.fd = source.cost
    }

    // Add source to message going out
    updates.push({ id: sourceId, cost: source.cost })
  }

  for (let neighborId in self.neighbors) {
    let neighbor = self.neighbors[neighborId]
    try {
      transmit(neighbor, self, updates)
    } catch (e) {
      // If the cost is infinity, update the source table
      self.sources[neighborId].cost = Infinity
    }
  }
}

initNodes(network)

ui.drawNetwork(network)

for (let nodeId in network.nodes) {
  setInterval(() => {
    setTimeout(() => {
      sendPeriodicUpdate(network.nodes[nodeId])
    }, Math.random() * tm)
  }, tm)
}
