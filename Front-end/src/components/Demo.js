import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from "graphql-tag";
import { Button, Grid, Typography, Dialog, TextField } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles';
import { withApollo } from 'react-apollo';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';

import classnames from 'classnames'
const GET_LIST_BOOKS = gql`
{
    getBooks{
        title
        id
        author
      }
  }`

const GET_INFO_BOOK = gql`
query IndexQuery($id: Int!) {
        getBook(id: $id){
          title
          id
          author
        }

}`

const DELETE_BOOK = gql`
mutation RemoveBook($id: Int!) {
        deleteBook(id: $id){
          title
          id
          author
        }

}`

const UPDATE_BOOK = gql`
mutation UpdateBook($id: Int!,$title:String!,$author:String!) {
        updateBook(id: $id,title:$title,author:$author){
          title
          id
          author
        }

}`
const ADD_BOOK = gql`
mutation AddBook($title:String!,$author:String!) {
    addBook(title:$title,author:$author){
          title
          id
          author
        }

}`

const SUBSCRIPTIONS_BOOK = gql`
subscription subscriptionBook($id: Int!){
    autoUpdateBook(id: $id){
    id
    author
    title
  }
}`
const SUBSCRIPTIONS_ADD_BOOK = gql`
subscription{
  autoAddBook{
    title
    author
    id
  }
}`

const SUBSCRIPTIONS_REMOVE_BOOK = gql`
subscription {
    realtimeRemove{
        title
        author
        id
    }
}`

function Demo(props) {
    const [listBooks, setListBooks] = useState(null);
    const [book, setBook] = useState(null);
    const { subscribeToMore, data, loading, error } = useQuery(GET_LIST_BOOKS);
    const [removeBook] = useMutation(DELETE_BOOK)
    const [updateBook] = useMutation(UPDATE_BOOK)
    const [addBook] = useMutation(ADD_BOOK)
    const titleRef = useRef(null)
    const authorRef = useRef(null)
    const classes = useStyles();

    // useSubscription(SUBSCRIPTIONS_ADD_BOOK, {
    //     onSubscriptionData: ({ subscriptionData }) => {
    //         console.log('render');
    //         setListBooks(subscriptionData.data.autoAddBook)
    //     }
    // })

    // useSubscription(SUBSCRIPTIONS_REMOVE_BOOK, {
    //     onSubscriptionData: ({ subscriptionData }) => {
    //         setListBooks(subscriptionData.data.realtimeRemove)
    //     }
    // })

    useEffect(() => {
        if (data && data.getBooks) {
            setListBooks(data.getBooks)
        }
    }, [data])

    useEffect(() => {
        subscribeToMore({
            document: SUBSCRIPTIONS_ADD_BOOK,
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;

                setListBooks(subscriptionData.data.autoAddBook)
                setBook(null)
            }
        })

        subscribeToMore({
            document: SUBSCRIPTIONS_REMOVE_BOOK,
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                console.log('Update book realtime', subscriptionData.data.realtimeRemove);
                setListBooks(subscriptionData.data.realtimeRemove)
                setBook(null)
            }
        })
        /*eslint-disable */
    }, [])

    const handlerClick = (value) => {
        props.client.query({
            query: GET_INFO_BOOK,
            variables: { id: value.id },
        }).then(res => {
            setBook(res.data.getBook[0])
        })
    }

    const handleClose = () => {
        setBook(null)
    }
    const openPanelBook = () => {
        setBook(true)
    }

    const handleUpdate = () => {
        updateBook({
            variables: {
                id: book.id,
                title: titleRef.current.value,
                author: authorRef.current.value
            }
        }).then(res => {
            console.log('Action updateBook manual', res.data.updateBook);
            setListBooks(res.data.updateBook)
            setBook(null)
        })
    }

    const handleRemove = (value) => {
        let temp = value.id ? value.id : book.id
        removeBook({ variables: { id: temp } }).then(res => {
            console.log('Action Remove', res.data.deleteBook);
            setListBooks(res.data.deleteBook)
            setBook(null)
        })
    }

    const handleAdd = () => {
        addBook({
            variables: {
                title: titleRef.current.value,
                author: authorRef.current.value
            }
        }).then(res => {
        })
    }
    const handleSubscription = (value) => {
        // setBook(value)
        console.log('Action Update 21', listBooks);
        subscribeToMore({
            document: SUBSCRIPTIONS_BOOK,
            shouldResubscribe: true,
            variables: { id: value.id },
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                let dataReceived = subscriptionData.data.autoUpdateBook
                console.log('prev', prev);
                let tempListBooks = listBooks.map(e => {
                    if (e.id === dataReceived.id) {
                        e.author = dataReceived.author;
                        e.title = dataReceived.title;
                    }
                    return e
                })
                console.log('Action Update', tempListBooks);
                setListBooks(tempListBooks)
            }
        })
    }
    if (error) return <p>Error</p>;
    let open = Boolean(book)
    return (
        <Grid container direction="column" className={classes.root}>
            <Grid item container
                justify="flex-end"
                className={classnames(classes.rootItem, classes.btnAdd)}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={openPanelBook}>
                    <AddCircleOutlineIcon />
                </Button>
            </Grid>
            {loading ? 'Loading...' :
                listBooks && listBooks.length > 0 && listBooks.map(e => {
                    return <Grid key={e.id} xs item container direction="row" justify='center' className={classes.rootItem}>
                        <Grid container direction="row">
                            <Grid item xs>
                                <Typography variant="h5" component="h2" className={classes.title}>  {e.title}  </Typography>
                                <Typography className={classes.title} color="textSecondary" gutterBottom> {e.author}  </Typography>
                            </Grid>
                            <Grid item className={classes.btnGroup}>
                                <Button variant="outlined" color="primary" onClick={() => handleSubscription(e)}><AutorenewIcon /></Button>
                                <Button variant="outlined" color="primary" onClick={() => handlerClick(e)}><MoreHorizIcon /></Button>
                                <Button variant="outlined" color="secondary" onClick={() => handleRemove(e)}><HighlightOffIcon /></Button>
                            </Grid>
                        </Grid>
                    </Grid>
                })
            }
            <Dialog xs fullWidth={true}
                onClose={handleClose}
                open={open}>
                <Grid container direction="column" className={classes.containerContent}>

                    <Grid item xs>
                        <TextField fullWidth variant='outlined' id="standard-basic" inputRef={titleRef} defaultValue={book && book.title} label="Title" />
                    </Grid>
                    <br />
                    <Grid item xs>
                        <TextField fullWidth variant='outlined' id="standard-basic" inputRef={authorRef} defaultValue={book && book.author} label="Author" />

                    </Grid>
                    <br />
                    <Grid item container direction="row" justify="space-between" className={classes.btnBookGroup}>
                        <Grid item >
                            <Button variant="=contained" color='secondary' fullWidth onClick={handleClose}>Back</Button>
                        </Grid>

                        <Grid item >
                            {(book && book.id) ?
                                <Button
                                    variant="=contained"
                                    color='primary'
                                    fullWidth onClick={handleUpdate}>
                                    Update
                                  </Button>
                                : <Button
                                    variant="=contained"
                                    color='primary'
                                    onClick={handleAdd}>
                                    Add
                                   </Button>
                            }
                        </Grid>
                    </Grid>
                </Grid>
            </Dialog>
        </Grid >
    )
}
const useStyles = makeStyles({
    root: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rootItem: {
        width: '500px',

    },
    btnGroup: {
        display: 'flex',
        alignItems: 'center',
        '& button:nth-child(n)': {
            marginLeft: 5,
        }
    },
    containerContent: {
        padding: '40px 10px 10px',
        '& input': {
            width: '100%',
        }
    },
    btnBookGroup: {
        '& div': {
            margin: 2,
            boxSizing: 'border-box'
        },
        '& div:nth-child(2) button': {
            background: '#ff5252',
            color: 'white'
        },
        '& div:nth-child(1) button': {
            background: '#65acea',
            color: 'white'
        }
    },
    btnAdd: {
        padding: 10,
        paddingRight: 0,
        '& button': {
            background: '#ff5252',
            '&:hover': {
                background: '#ff5252',
                opacity: 0.7
            }
        }
    },
    title: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 250,
    }
})
export default withApollo(Demo)