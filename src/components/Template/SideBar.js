import React from 'react';
import { Link } from 'react-router-dom';

import ContactIcons from '../Contact/ContactIcons';

const { PUBLIC_URL } = process.env; // set automatically from package.json:homepage

const SideBar = () => (
  <section id="sidebar">
    <section id="intro">
      <Link to="/" className="logo">
        <img src={`${PUBLIC_URL}/images/me.jpg`} alt="" />
      </Link>
      <header>
        <h2>Justin Dominic</h2>
        <p><a href="mailto:justincdominic@gmail.com">justincdominic@gmail.com</a></p>
      </header>
    </section>

    <section className="blurb">
      <h2>About</h2>
      <p>Hi, I&apos;m Justin.
        I am a <a href="https://www.questbridge.org/">QuestBridge Scholar</a> at <a href="https://www.yale.edu/">Yale University</a> studying Computer Science and Economics with a certificate in Data Science.

      </p>
      <ul className="actions">
        <li>
          {!window.location.pathname.includes('/resume') ? <Link to="/resume" className="button">Learn More</Link> : <Link to="/about" className="button">About Me</Link>}
        </li>
      </ul>
    </section>

    <section id="footer">
      <ContactIcons />
      <p className="copyright">&copy; Justin Dominic <Link to="/">jcdominic.github.io</Link>.</p>
    </section>
  </section>
);

export default SideBar;
