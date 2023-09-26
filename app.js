const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const jsonMiddleware = express.json();
app.use(jsonMiddleware);
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http:/localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
  }
};
initializeDBAndServer();
//authentication
function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        // request.username = payload.username;
        next();
      }
    });
  }
}

const conObject = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

const conObject1 = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

const conObject2 = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.likes,
    replies: dbObject.replies,
    dateTime: dbObject.dateTime,
  };
};
const l = [];
function conObject3(dbObject, len) {
  l.push(dbObject.username);
  // console.log(l);
  return l;
}
const l1 = [];
function conObject4(dbObject, len) {
  l1.push(dbObject.name);
  l1.push(dbObject.reply);
  // console.log(l);
  return {
    name: dbObject.name,
    reply: dbObject.reply,
  };
}

//Get API-1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(username, password, name, gender);
  const a = ` SELECT * FROM user          
        WHERE 
            username = '${username}';`;
  const arr = await db.get(a);
  if (arr !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      console.log(password.length);
      response.status(400);
      response.send("Password is too short");
    } else {
      const getQuery = `
        INSERT INTO user (username,password,name,gender)
        VALUES
        (
            '${username}',
            '${password}',
            '${name}',
            '${gender}'
        )
        ;`;
      const Array = await db.run(getQuery);
      const id = Array.lastID;
      response.send("User created successfully");
    }
  }
});
//API-2
app.post("/login/", authenticateToken, async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);

  const getA1 = `SELECT * from tweet natural join user where username='${username}';`;
  const dbUser = await db.get(getA1);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      hashedPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
//API-3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const selectDuaDateQuery = `
        SELECT * from tweet natural join user order by username desc limit 4
        ;`;
  const arr = await db.all(selectDuaDateQuery);
  response.send(arr.map((each) => conObject(each)));
});
//API-4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const sel = `
        SELECT distinct(name) from user u,follower f where f.following_user_id=u.user_id 
        ;`;

  const arr = await db.all(sel);
  const name = arr.name;
  // console.log({ name });
  response.send(arr.map((each) => conObject1(each)));
});
//API-5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const sel = `
        SELECT distinct(name) from user u,follower f where f.follower_user_id=u.user_id 
        ;`;

  const arr = await db.all(sel);
  const name = arr.name;
  // console.log({ name });
  response.send(arr.map((each) => conObject1(each)));
});

// API-6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const sel = `
        SELECT 
        tweet,
        sum(like_id) as likes,
        reply as replies,
        date_time as dateTime
        from tweet t,user u,reply r, like l where t.tweet_id='${tweetId}' and u.user_id=t.user_id
        and t.tweet_id=r.tweet_id and r.tweet_id=l.tweet_id
        ;`;
  if (sel === undefined) {
    response.status(401);
    response.send("Invalid Request");
  }
  const arr = await db.all(sel);
  // console.log({ name });
  response.send(arr.map((each) => conObject2(each)));
});
//API7
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const sel = `
        SELECT 
        username,
       like_id as likes
        from tweet t,user u, like l where t.tweet_id='${tweetId}' and u.user_id=t.user_id
        and t.tweet_id=l.tweet_id 
        ;`;
    if (sel === undefined) {
      response.status(401);
      response.send("Invalid Request");
    }
    const arr = await db.all(sel);
    // console.log({ name });
    const len = arr.length;
    const re = arr.map((each) => conObject3(each, len));
    console.log(re[0]);

    response.send({ likes: re[0] });
  }
);

//API8
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const sel = `
        SELECT 
        *
        from tweet t,user u, reply r where t.tweet_id='${tweetId}' and u.user_id=t.user_id
        and t.tweet_id=r.tweet_id 
        ;`;
    if (sel === undefined) {
      response.status(401);
      response.send("Invalid Request");
    }
    const arr = await db.all(sel);
    // console.log({ name });
    const len = arr.length;
    const re = arr.map((each) => conObject4(each, len));
    // console.log(re[0]);

    response.send({ replies: re });
  }
);

// API-9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  //const { tweetId } = request.params;
  const sel = `
        SELECT 
        tweet,
        sum(like_id) as likes,
        reply as replies,
        date_time as dateTime
        from tweet t,user u,reply r, like l where u.user_id=t.user_id
        and t.tweet_id=r.tweet_id and r.tweet_id=l.tweet_id
        ;`;
  if (sel === undefined) {
    response.status(401);
    response.send("Invalid Request");
  }
  const arr = await db.all(sel);
  // console.log({ name });
  response.send(arr.map((each) => conObject2(each)));
});
//API10
app.post("user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const query = `insert into tweet set(tweet) values('${tweet}');`;
  console.log(query);
  const arr = await db.run(query);
  console.log(arr);
  response.send("Created a Tweet");
});
//API11
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const q = `delete from tweet where tweet_id='${tweetId}' and user_id=(select user_id from user) ;`;
    //console.log(q);
    if (q === undefined) {
      response.status(401);
      response.send("Invalid Request");
    }
    const arr = await db.run(q);
    //console.log(arr);
    response.send("Tweet Removed");
  }
);

module.exports = app;
