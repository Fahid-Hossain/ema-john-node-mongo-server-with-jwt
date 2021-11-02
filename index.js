const express = require("express");
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
var cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;


//Firebase Admin initialization

var serviceAccount = require("./ema-john-with-firebase-auth-firebase-adminsdk-jamqq-ac523b239c.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware 
app.use(cors());
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Hello Node");
})

//mongodb connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w2qch.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// varify token
async function verifyToken(req, res, next) {
    if(req.headers.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split("Bearer ")[1];
        // console.log("Inside separate function",idToken);

        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            // console.log("email",decodedUser.email);
            req.decodedUserEmail = decodedUser.email;
        }
        catch{

        }
    }
    next();
}



// node mongodb
async function run() {
    try {
        await client.connect();
        const database = client.db("emajhon_eShop");
        const productCollection = database.collection("products");
        const orderCollection = database.collection("orders");
        // create a document to insert
        //   const doc = {
        //     title: "Record of a Shriveled Datum",
        //     content: "No bytes, no problem. Just insert a document, in MongoDB",
        //   }
        //   const result = await productCollection.insertOne(doc);
        //   console.log(`A document was inserted with the _id: ${result.insertedId}`);


        app.get("/products", async (req, res) => {
            const cursor = productCollection.find({});
            //pagination page count set
            //   console.log(req.query)
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                products = await cursor.toArray();
            }
  
            res.send({
                count,
                products

            });
        })

        //use post to get data
        app.post("/products/bykeys",async(req,res) => {
            // console.log(req.body);
            const keys = req.body;
            const query = {key:{$in: keys}}
            const products = await productCollection.find(query).toArray();
            res.json(products);
        })

        //Add order api
        app.get("/orders", verifyToken, async (req, res)=>{
            // console.log(req.headers.authorization)
            const email = req.query.email;
            if(req.decodedUserEmail=== email){               
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else{
                res.status(401).json({message:"User not Authorized"})
            }
        })


        app.post("/orders",async(req,res) => {
            const order = req.body;
            order.createdAt = new Date();
            // console.log("orders", order);
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log("listening at localhost port", port);
})