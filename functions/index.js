const functions = require('firebase-functions');
const express = require('express');

const bodyParser = require ('body-parser');
const path = require('path');
const firebase = require('firebase');
const serviceAccount = require("./serviceAccountKey.json");
const emailRegex = new RegExp(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/);

const app = express();

var config = {
    apiKey: "AIzaSyDS9owx0q_Eq96Cs2T-xD0s_cEHi4AxrEI",
    authDomain: "testing-island.firebaseapp.com",
    databaseURL: "https://testing-island.firebaseio.com",
    projectId: "testing-island",
    storageBucket: "testing-island.appspot.com",
    messagingSenderId: "1059701996270"
};
const firebaseService = firebase.initializeApp(config);

var firebaseAuth = firebaseService.auth();
// var firebaseStorage = firebaseService.storage(); This is be use later
var firebaseDatabase = firebaseService.database();
var firebaseFirestore = firebaseService.firestore();
const settings = {timestampsInSnapshots: true};
firebaseFirestore.settings(settings);
// var firebaseMessaging = firebaseService.messaging(); This is be use later

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false})); //hook up with your app

// Set static path
//app.use(express.static(path.join(__dirname, 'src'))); //initializing the app with the directory of the app.js

app.get('/', (req, res)=>{
    res.send('Hello');
});

app.get('/hi', (req,res)=>{
    res.send("Hello World!");
});

//returns a json of element names of the aisles and the groups as corresponding arrays
app.get('/aisles_and_groups', (req,res)=>{
    let items = {}
    firebaseFirestore.collection("Aisles").get().then((coll)=> {
        coll.forEach((doc) => {
            var tmp = doc.id;
            items[tmp] = [];
            // adds groups to the aisles element arrays
            doc.data()['subCollections'].forEach((e)=>{
                items[tmp].push(e);
            })
        });
        res.send(items);     
    }).catch(function(error){
        console.log(error);
    });
})

//gets the aisles and their ing urls
app.get('/load_aisles', (req,res) => {
    let aisles = {}
    firebaseFirestore.collection("Aisles").get().then((coll) =>{
        coll.forEach((doc) =>{
            let tmp = doc.id
            aisles[tmp] = []
            aisles[tmp].push(tmp)
            aisles[tmp].push(doc.data()['imgURL'])
        })
        res.send(aisles)
    }).catch(function(error){
        console.log(error)
    })
})

//loads all items from requested aisle
app.get('/load_items', (req,res) => {
    let items = []
    let aisleName = Object.keys(req.query)[0]
    console.log(aisleName)
    firebaseFirestore.collection("Aisles").doc(aisleName).get().then((doc) =>{
        let groups = doc.data()["subCollections"]
        groups.forEach((groupName) =>{
            firebaseFirestore.collection("Aisles").doc(aisleName).collection(groupName).get().then((coll) =>{
                coll.forEach((doc) =>{
                    items.push(doc.data()["name"])
                })
            }).catch(function(error){
                console.log(error)
            }).then(e =>{
                 // this gives a error because its returning before the execution but it gives the correct results somehow?
            })
        })
    }).then(e =>{
        res.send(items)
    })
})

//adds a new item to the database
app.post('/add_item', (req,res) =>{
    //verifies that the user is an admin
    let itemData = req.body
    // console.log(itemData)
    let itemid
    let itemProperties = {
        name: itemData.Name,
        aisle: itemData.Aisle,
        group: itemData.Group,
        quantity: itemData.Quantity, 
        sale: itemData.Sale, 
        salePercent: itemData.SalePercent, 
        info: itemData.Info,
        imgURL: ""
    }

    // create new item in the items collection
    firebaseFirestore.collection('Items').add(itemProperties).then(ref => {
        console.log('Added document with ID: ', ref.id)
        itemid = ref.id

        //create new item in the correct aisle collection with a uid store isle address and uid for item page
        firebaseFirestore.collection('Aisles').doc(itemData.Aisle).collection(itemData.Group).doc(itemid).set(itemProperties)
        res.send(itemid)
    });

})

app.post('/register_user', (req,res)=>{
    let email = req.body.username;
    let password = req.body.password;

    if(emailRegex.test(email) && password.length >= 6){
        firebaseAuth.createUserWithEmailAndPassword(email, password);
        firebaseAuth.onAuthStateChanged(firebaseUser => {
            var ref = firebaseFirestore.collection("Customer").doc(firebaseUser.uid);
            ref.set({
                email: email,
                lastName: "",
                firstName: ""
            })
        })
        console.log("success");
    } else {
        console.log("fail");
        //alert('Either email nor password is invalid.');
        return;
    }
    
});

app.post('/login_user', (req,res)=>{
    console.log(req.body);
    let email = req.body.username;
    console.log("here is email: " + email);
    let password = req.body.password;
    console.log("here is password: " + password);

    if(emailRegex.test(email) && password.length >= 6){
        firebaseAuth.signInWithEmailAndPassword(email, password);
        res.send(email);
        console.log("login successed");
    } else {
        console.log("login failed");
        //alert('Either email nor password is invalid.');
        return;
    }
    
});

app.get('/get_cart', (req,res)=>{
    console.log("test");
    var ref = firebaseFirestore.collection('Aisles').doc('Bakery').collection('Bread');
    ref.get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        console.log(doc.id, '=>', doc.data());
      });
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });
});

app.get('/get_inventory', (req,res)=>{
    let items = [];
    //var ref_inventory = firebaseFirestore.collection('Aisles').doc("Bakery/Bread");
    firebaseFirestore.collection("Aisles").get().then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
            var tmp = doc.id;
            items.push(tmp);
        });
        console.log(items);
        //send items before error handling
        res.send(items);
    }).catch(function(error){
        console.log(error);
    });
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

exports.app = functions.https.onRequest(app);
