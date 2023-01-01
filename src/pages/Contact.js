import React from 'react';
import { Link } from 'react-router-dom';

import Main from '../layouts/Main';
import EmailLink from '../components/Contact/EmailLink';
import ContactIcons from '../components/Contact/ContactIcons';

const Contact = () => (
  <Main
    title="Contact"
    description="Contact Justin Dominic via justincdominic@gmail.com or justin.dominic@yale.edu"
  >
    <article className="post" id="contact">
      <header>
        <div className="title">
          <h2 data-testid="heading"><Link to="/contact">Contact</Link></h2>
        </div>
      </header>
      <div className="email-at">
        <p>Feel free to reach out to me at:  
          {/* Links to my personal and school emails */}
          <a href="mailto:justincdominic@gmail.com"> My Personal Email </a>
          or at
          <a href="mailto:justin.dominic@yale.edu"> My Yale Email</a>.
        </p>
        {/* <EmailLink /> */}
      </div>
      <ContactIcons />
    </article>
  </Main>
);

export default Contact;
