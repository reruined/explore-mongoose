require('dotenv').config()
const express = require('express')

const PORT = process.env.PORT || 5000;

const app = express()
app.use('/', (req, res, next) => {
  console.log(`[${req.ip}] ${req.method} ${req.path}`)
  next()
})
app.use(express.static(process.env.PUBLIC_FOLDER_PATH))

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`)
})

