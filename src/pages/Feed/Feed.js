import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';
import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: false,
    editLoading: false
  };
  
  componentDidMount() {
    const graphql = {
      query : `{
        status{
          status
        }
      }`
    }
    fetch('http://localhost:8090/graphql',{
      method:'POST',
      body:JSON.stringify(graphql),
      headers:{
        Authorization:'Bearer: '+this.props.token,
        'Content-Type':'application/json'
       }
    })
      .then(res => {
        
        return res.json();
      })
      .then(resData => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error('Validation failed.');
        }
        if (resData.errors) {
          console.log('Error!');
          throw new Error('Could not authenticate you!');
        }
        this.setState({ status: resData.data.status.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  //  const socket  = openSocket('http://localhost:8090');
  //  socket.on('posts',(data)=>{
  //    if(data.action === 'create'){
  //      this.addPost(data.post)
  //    }
  //  })
  }

  addPost = post =>{
    this.setState((prevState)=>{
      this.updatedPost = [...prevState.posts];
      if(prevState.postPage === 1){
        this.updatedPost.pop();
        this.updatedPost.unshift(post);
      }
      return {
        posts:this.updatedPost,
        totalPosts: prevState.totalPosts+1
      }
    })
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    const graphql = {
      query:`
      {
      post(page:${page}) {
        posts {
          id,
          title,
          content,
          author,
          createdAt,
          updatedAt
        }
        totalPosts
      }
    }
    `
    }
    fetch('http://localhost:8090/graphql',{
      method:'POST',
      body:JSON.stringify(graphql),
      headers:{
        Authorization:'Bearer: '+this.props.token,
        'Content-Type':'application/json'
      }
    })
      .then(res => {
    return res.json();
      })
      .then(resData => {
      this.setState({
          posts: resData.data.post.posts.map((post)=>{
             return {
               ...post,
               imagePath:post.imageUrl,
              
            }
          }),
          totalPosts: resData.data.post.totalPosts,
          postsLoading: false
        });

      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    console.log('event--->',event.target.dataset);
    event.preventDefault();
    const graphql = {
      query:`
        mutation {
          updateStatus(status:"${this.state.status}")
          {
            message
          }
        }
      `
    }
    fetch('http://localhost:8090/graphql',{
      method:'POST',
      headers:{
      'Content-Type':'application/json',
       Authorization:'Bearer: '+this.props.token
      },
      body:JSON.stringify(graphql)
    })
      .then(res => {
       
        return res.json();
      })
      .then(resData => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error('Validation failed.');
        }
        if (resData.errors) {
          console.log('Error!');
          throw new Error('Could not authenticate you!');
        }
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p.id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    // Set up data (with image!)
    let url = 'http://localhost:8090/graphql';
    let method = 'POST'
    
    const formData = new FormData()
   formData.append('image',postData.image)
   if(this.state.editPost){
    formData.append('oldPath',this.state.editPost.imagePath)
   }
   fetch('http://localhost:8090/post-images',{
    method:'PUT',
    body:formData,
    headers:{
      Authorization:'Bearer: '+this.props.token,
    }
    
  }).then((res)=>{
    return res.json()
  }).then((resData)=>{
    console.log('resdata',resData)
    let graphqlbody = !this.state.editPost ?  {
      query:`
        mutation {
          createPost(post:{
            title:"${postData.title}",
            content:"${postData.content}",
            author:"ANKUSH",
            imageUrl:"${resData.filepath}"
          }
        )
          {
            id,
           title,
           content,
            creator,
            createdAt,
            imageUrl
          }
        }
      `
    }:
    {
      query : `
      mutation{
        updatePost(
          post:
          {
          id:"${this.state.editPost.id}",
          title:"${postData.title}",
          content:"${postData.content}",
          imageUrl:"${resData.filepath}"
          }
        )
        {
          id,
          title,
          content,
          creator,
          imageUrl,
          createdAt
        }
        
      }
      `
    };
    fetch(url,{
      method:method,
      body:JSON.stringify(graphqlbody),
      headers:{
        Authorization:'Bearer: '+this.props.token,
        'Content-Type':'application/json'
      }
    })
      .then(res => {
       
        return res.json();
      })
      .then(resData => {
        console.log('resData--->',resData)
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error('Validation failed.');
        }
        if (resData.errors) {
          console.log('Error!');
          throw new Error('Could not authenticate you!');
        }
        const post = {
          id: this.state.editPost ? resData.data.updatePost.id : resData.data.createPost.id,
          title: this.state.editPost ? resData.data.updatePost.title : resData.data.createPost.title,
          content: this.state.editPost ? resData.data.updatePost.content : resData.data.createPost.content,
          creator: this.state.editPost ? resData.data.updatePost.creator : resData.data.createPost.creator,
          createdAt: this.state.editPost ? resData.data.updatePost.createdAt : resData.data.createPost.createdAt,
          imageUrl:this.state.editPost ? resData.data.updatePost.imageUrl : resData.data.createPost.imageUrl
        };
        console.log('postIndex',post)
        this.setState(prevState => {
          let updatedPosts = [...prevState.posts];
          let updatetotalPosts = prevState.totalPosts;
          console.log('postIndex',updatedPosts)
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              p => p.id === prevState.editPost.id
            );
            console.log('postIndex',postIndex)
            updatedPosts[postIndex] = post;
          } else if (prevState.posts.length < 2) {
            updatetotalPosts++;
            updatedPosts = prevState.posts.concat(post);
            console.log('postIndex',updatedPosts)
          }
         
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
            totalPosts:updatetotalPosts
          };
        })
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        
      });
    });
  })
}
  
 

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphql = {
      query:`
      mutation{
        deletePost(id:"${postId}"){
          message
        }
        
      }
      
      `
    }
    fetch('http://localhost:8090/graphql',
    {
      method:'POST',
      headers:{
      Authorization:'Bearer: '+this.props.token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(graphql)
  })
  .then(res => {
       
    return res.json();
  })
  .then(resData => {
    console.log('resData--->',resData)
    if (resData.errors && resData.errors[0].status === 422) {
      throw new Error('Validation failed.');
    }
    if (resData.errors) {
      console.log('Error!');
      throw new Error('Could not authenticate you!');
    }
        this.setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p.id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  }

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post.id}
                  id={post.id}
                  author={post.author}
                  date={new Date(Number(post.createdAt)).toLocaleString('en-US')}
                  title={post.title}
                  image={post.imageUrl || ''}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post.id)}
                  onDelete={this.deletePostHandler.bind(this, post.id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
