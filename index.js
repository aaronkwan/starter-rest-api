const express = require('express')
const app = express()
const db = require('@cyclic.sh/dynamodb')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const col = "leaderboard";

// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
//   index: ['index.html'],
//   maxAge: '1m',
//   redirect: false
// }
// app.use(express.static('public', options))
// #############################################################################

// Submit a score to the leaderboard (store duplicates), return the top 10:
app.post('/submit/:score?', async (req, res) => {
  const score = req.params.score;
  console.log(`from collection: ${col} update key: ${score} with params ${JSON.stringify(req.params)}`)
  const leaderboard = db.collection(col);

  if (score) {
    // Update score's count:
    let item = await leaderboard.get(score);
    if (item == null) {
      item = await leaderboard.set(score, { count: 1 });
    }
    else {
      console.log(JSON.stringify(item, null, 2));
      item = await leaderboard.set(score, { count: (item.props.count + 1) });
    }
  }
  // Return top ten scores:
  const items = await leaderboard.list();
  const scores = items.results.map(item => (parseInt(item.key)));
  scores.sort((a, b) => b - a);
  scores.splice(10);
  console.log(JSON.stringify(scores, null, 2));
  res.json({ scores: scores }).end();
})

// Delete a score or all scores:
app.delete('/delete/:score?', async (req, res) => {
  const score = req.params.score;
  let leaderboard = db.collection(col);

  // Delete all scores:
  if (!score) {
    console.log(`from collection: ${col} delete all items with params ${JSON.stringify(req.params)}`)
    const items = await leaderboard.list();
    for (const item of items.results) {
      await leaderboard.delete(item.key);
    }
    res.json(items).end();
    return;
  }

  // Delete a single score:
  console.log(`from collection: ${col} delete key: ${score} with params ${JSON.stringify(req.params)}`)
  const item = await leaderboard.delete(score);
  res.json(item).end()
})


// Get a score or all scores:
app.get('/:score', async (req, res) => {
  const key = req.params.score;
  let leaderboard = db.collection(col);

  // Get all scores:
  if (key == "") {
    console.log(`from collection: ${col} get all items with params ${JSON.stringify(req.params)}`)
    const items = await leaderboard.list();
    console.log(JSON.stringify(items, null, 2))
    res.json(items).end();
    return;
  }

  // Get a single score:
  console.log(`from collection: ${col} get key: ${score} with params ${JSON.stringify(req.params)}`)
  const item = await leaderboard.get(score);
  console.log(JSON.stringify(item, null, 2));
  res.json(item).end();
})

// Catch all handler for all other request.
app.use('*', (req, res) => {
  res.json({ msg: 'no route handler found' }).end()
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening on ${port}`)
})
