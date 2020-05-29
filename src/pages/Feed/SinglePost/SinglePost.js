import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphql =  {
      query:`
        {
          viewPost(id:"${postId}")
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
    }
    fetch('http://localhost:8090/graphql',{
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
      if (resData.errors && resData.errors[0].status === 422) {
        throw new Error('Validation failed.');
      }
      if (resData.errors) {
        console.log('Error!');
        throw new Error('Could not authenticate you!');
      }
        this.setState({
          title: resData.data.viewPost.title,
          author: resData.data.viewPost.author,
          date: new Date(resData.data.viewPost.createdAt).toLocaleDateString('en-US'),
          content: resData.data.viewPost.content,
          image:'http://localhost:8090/images/'+resData.data.viewPost.imageUrl
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
