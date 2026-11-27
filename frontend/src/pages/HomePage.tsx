import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
const examples = [
  {
    name: 'Electrical',
    title: 'Exposed wiring near the staircase',
    description:
      'There are live wires sparking near the second-floor staircase in the main block.',
    category: 'Electrical and lighting',
    priority: 'Critical',
    reason: 'Sparking live wires require immediate safety review.',
    location: 'Main Academic Block',
  },
  {
    name: 'Water supply',
    title: 'No water in the hostel washrooms',
    description:
      'The third-floor taps have been dry since yesterday. More than 80 residents are affected.',
    category: 'Water supply',
    priority: 'High',
    reason: 'An essential service disruption affects an entire hostel floor.',
    location: 'Hostel · Third floor',
  },
  {
    name: 'Classroom',
    title: 'Projector not working in hall 101',
    description:
      'The lecture hall projector will not turn on. The bulb warning light is blinking.',
    category: 'Classroom and laboratory facilities',
    priority: 'Medium',
    reason:
      'Teaching is disrupted, with no immediate physical hazard reported.',
    location: 'Lecture Hall 101',
  },
];
export function HomePage() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="hero-title">
        <img
          className="hero-photo"
          src="/campus.jpg"
          alt="JIS College of Engineering campus"
          width="2000"
          height="1333"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="hero-kicker">
            <span />A better everyday. For everyone on campus.
          </p>
          <h1 id="hero-title">
            <span className="hero-line"><span>See an issue.</span></span>
            <span className="hero-line"><span>Make a difference.</span></span>
          </h1>
          <div className="hero-bottom">
            <div>
              <p>
                From the leaky tap to the broken light.
                <br />
                Speak up. We’ll help it reach the right people.
              </p>
              <div className="hero-actions">
                <Link to="/submit" className="button button-light">
                  Report an issue
                  <ArrowUpRight />
                </Link>
                <Link to="/track" className="hero-track">
                  Track your report
                  <ArrowRight />
                </Link>
              </div>
            </div>
            <a href="#how-it-works" className="hero-scroll">
              <span>
                Better campus.
                <br />
                One report at a time.
              </span>
              <span className="circle-arrow">
                <ArrowDown />
              </span>
            </a>
          </div>
        </div>
        <div className="hero-index">
          <span>01 / Campus, connected</span>
          <span>Built for students. Backed by campus teams.</span>
        </div>
      </section>
      <div className="landing-rail">
        <span>A little care goes a long way.</span>
        <div>
          <span>
            <CheckCircle2 />
            Clear priorities
          </span>
          <span>
            <CheckCircle2 />
            Visible progress
          </span>
          <span>
            <CheckCircle2 />
            Human decisions
          </span>
        </div>
      </div>
      <section id="how-it-works" className="landing-section process-section">
        <div className="section-intro">
          <p className="eyebrow">The path to better</p>
          <h2>
            Less chasing.
            <br />
            More resolving.
          </h2>
          <p>
            You shouldn’t need to know which department to call. Just tell us
            what’s happening.
          </p>
          <Link to="/submit" className="text-link">
            Let’s get it sorted
            <ArrowUpRight />
          </Link>
        </div>
        <div className="process-list">
          {[
            [
              '01',
              'Tell us what’s wrong',
              'Describe the issue in your own words and add its campus location. No department directory required.',
            ],
            [
              '02',
              'Get it to the right team',
              'AI suggests a category and urgency. Campus administrators review the report and assign it for action.',
            ],
            [
              '03',
              'Follow it through',
              'Use your tracking ID to see status changes, progress notes, and the final resolution.',
            ],
          ].map(([number, title, description]) => (
            <article key={number}>
              <span className="process-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <ArrowUpRight />
            </article>
          ))}
        </div>
      </section>
      <section id="our-approach" className="landing-demo">
        <div className="demo-copy">
          <p className="eyebrow">A little intelligence. A lot of clarity.</p>
          <h2>
            Your words.
            <br />
            The right action.
          </h2>
          <p>
            Behind every report is a real problem. ResolveXAI helps campus teams
            understand what it is, how urgent it is, and where to begin.
          </p>
          <div className="demo-principle">
            <ShieldCheck />
            <div>
              <h3>Assistance, with accountability</h3>
              <p>
                AI makes recommendations. People review them. Every status
                change leaves a record.
              </p>
            </div>
          </div>
          <Link to="/model-eval" className="text-link">
            Explore our approach
            <ArrowUpRight />
          </Link>
        </div>
        <div className="example-panel">
          <div className="example-header">
            <span className="eyebrow">See how a report takes shape</span>
            <span className="example-label">Illustrative example</span>
          </div>
          <div className="sample-tabs" aria-label="Choose an example">
            {examples.map((item, index) => (
              <button
                key={item.name}
                aria-pressed={selected === index}
                className={selected === index ? 'active' : ''}
                onClick={() => setSelected(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="example-report" key={selected}>
            <span className="report-meta">Student report</span>
            <h3>{example.title}</h3>
            <p>“{example.description}”</p>
            <span className="example-location">
              <MapPin />
              {example.location}
            </span>
            <div className="triage-result">
              <div>
                <span>Suggested category</span>
                <strong>{example.category}</strong>
              </div>
              <div>
                <span>Suggested priority</span>
                <PriorityBadge priority={example.priority} />
              </div>
            </div>
            <p className="example-reason">
              <ShieldCheck />
              {example.reason}
            </p>
            <div className="example-confirm">
              <Check />
              Ready for a campus administrator to review
            </div>
          </div>
        </div>
      </section>
      <section className="capability-band">
        <div>
          <p className="eyebrow light">Purpose built for campus</p>
          <h2>
            Every detail.
            <br />
            Accounted for.
          </h2>
        </div>
        <dl>
          <div>
            <dt>Complaint categories</dt>
            <dd>10</dd>
          </div>
          <div>
            <dt>Priority levels</dt>
            <dd>04</dd>
          </div>
          <div>
            <dt>Lifecycle statuses</dt>
            <dd>07</dd>
          </div>
          <div>
            <dt>Final decisions</dt>
            <dd className="human-stat">Human</dd>
          </div>
        </dl>
      </section>
      <section className="landing-section audience-section">
        <div className="section-intro">
          <p className="eyebrow">Two perspectives. One better campus.</p>
          <h2>
            On the same side
            <br />
            of the solution.
          </h2>
        </div>
        <div className="audience-grid">
          <article>
            <span className="report-meta">For students</span>
            <h3>
              A voice that
              <br />
              doesn’t get lost.
            </h3>
            <p>
              Report a problem, keep your tracking ID, and check what’s
              happening from your personal dashboard.
            </p>
            <Link to="/dashboard" className="text-link">
              Your workspace
              <ArrowUpRight />
            </Link>
          </article>
          <article>
            <span className="report-meta">For campus teams</span>
            <h3>
              Clarity to act.
              <br />
              Room to prioritise.
            </h3>
            <p>
              Review incoming reports, spot urgent issues, assign departments,
              and keep students in the loop.
            </p>
            <Link to="/admin/login" className="text-link">
              Campus operations
              <ArrowUpRight />
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
