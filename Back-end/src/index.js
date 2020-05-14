// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '.env') });
import { ApolloServer, gql, withFilter } from 'apollo-server-express';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from "ioredis";
import http from 'http';
import express from 'express';
const pathGraphql = "/demo";
const PORT = 4000
const options = {
    host: 'localhost',
    port: '6379',
    retryStrategy: times => {
        // reconnect after
        return Math.min(times * 50, 2000);
    }
};


const pubsub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options)
});

// const pubsub = new PubSub();
// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const NEW_BOOK = 'NEW_BOOK'
const UPDATE_BOOK = 'UPDATE_BOOK'
const REMOVE_BOOK = 'REMOVE_BOOK'

const typeDefs = gql`
type Book {
    id:Int,
    title: String
    author: String
  }

  type Author {
    author: String
    books: [Book]
  }
 
  type Query {
    getBooks: [Book]
    getAuthors: [Author]
    getBook(id:Int):[Book]
  }
  type Mutation {
    addBook(title: String, author: String!): [Book]
    updateBook(id:Int,title:String,author:String):[Book],
    deleteBook(id:Int):[Book]
    actionPm2(name:String,action:String):String
 
  }
  type Subscription {
    autoAddBook:[Book]
    autoUpdateBook(id:Int):Book
    realtimeRemove:[Book]
  }

`;
let books = [
    {
        id: 1,
        title: 'Harry Potter and the Chamber of Secrets',
        author: 'J.K. Rowling',
    },
    {
        id: 2,
        title: 'Jurassic Park',
        author: 'Michael Crichton',
    },
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
        getBooks: () => books,
        getAuthors: () => books,
        getBook: (_, args, context, info) => {
            const { title, id } = args
            let result = books.filter(e => e.id === id)
            if (result.length > 0) {
                return result
            }
            return null
        }

    },
    Mutation: {
        addBook: (_, args, { pubsub }) => {
            let isSameKey = true
            let key = null;
            do {
                key = Math.floor(Math.random() * (1999 - 1000 + 1)) + 1000;
                const checkSameKey = books.filter(e => e.id === key)
                if (checkSameKey.length <= 0) {
                    isSameKey = false
                }
            } while (isSameKey)
            books.push({ ...args, id: key })
            //Listing action realtime
            pubsub.publish(NEW_BOOK, {
                autoAddBook: books
            })
            console.table(books)
            return books
        },
        updateBook: (_, args) => {
            const { title, id, author } = args
            let result = books.filter(e => e.id === id)
            if (result.length > 0) {
                result[0].title = title;
                result[0].author = author;
            }
            pubsub.publish(UPDATE_BOOK, {
                autoUpdateBook: result[0]
            })
            console.table(books)
            return books
        },
        deleteBook: (_, args, { pubsub }) => {
            const { id } = args
            let result = books.filter(e => e.id !== id)
            books = result
            pubsub.publish(REMOVE_BOOK, {
                realtimeRemove: result
            })
            return result
        },
        actionPm2: (_, args, { pubsub }) => {
            const { action, name } = args
            // run()
            // getProcessSetting(name)
            return 'Susccess !'
        },
    },
    Subscription: {
        autoAddBook: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(NEW_BOOK),
                (payload, variables) => {
                    return true
                },
            ),
        },
        autoUpdateBook: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(UPDATE_BOOK),
                (payload, variables) => {
                    return payload.autoUpdateBook.id === variables.id
                }
            )
        },
        realtimeRemove: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(REMOVE_BOOK),
                (payload, variables) => {
                    return true
                }
            )
        }
    }
};
// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: (req, res) => ({ req, res, pubsub }),
    subscriptions: {
        path: pathGraphql
    }
});
let app = express();
server.applyMiddleware({ app, path: pathGraphql });
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
// The `listen` method launches a web server.

httpServer.listen(PORT, () => {
    console.log(
        `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
        `🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`
    );
});