```
npm install
npm start
```
open `localhost:4456`

This is a simulation of a Bellman-Ford routing algorithm similar to Babel.

Bellman-Ford (or distance vector) routing algorithms operate on the general principle of "If node A is 5 hops away from node B, and I'm 1 hop away from node A, then I'm 6 hops away from node B, and can reach it by sending messages to node A."

Nodes send updates to one another consisting of their distance to all other nodes on the network. Using these updates, they are able to build up routing tables. A naive Bellman-Ford implementation is susceptible to routing loops, which happen when a routing update travels from node A to node B to node C and back to node A.

This simulation uses Babel's feasibility condition before accepting a routing update to mitigate this phenomenon.

```
A accepts update if D(B) < FD(A)
```

`A` will accept an update about `S` from `B` if the distance that `B` is advertising for `S` is smaller than `A`'s feasibility distance (the smallest distance that `A` has ever advertised for `S`).


MIT license
