import React, { useState } from 'react';
import './RSVPForm.css';

const RSVPForm = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    yearOfGraduation: '',
    courseDept: '',
    organization: '',
    designation: '',
    city: '',
    email: '',
    contactNumber: '',
    attending: '',
    accompaniedByFamily: '',
    adults: '',
    kids: '',
    eventsDay1: {
      networking: false,
      campusTour: false,
      entrepreneurshipTalk: false,
      alumniTalk: false,
      spotGames: false,
      lunchBreak: false,
      interactionSessions: false,
      memoryWall: false,
      teaBreak: false,
      interactionVivekAlva: false,
      askMeAnything: false,
      inauguration: false,
      culturalProgram: false,
      dinner: false,
    },
    eventsDay2: {
      plantingSaplings: false,
      breakfast: false,
      excursionSasithithlu: false,
      excursionKudremukh: false,
    },
    dietaryPreference: '',
    needAccommodation: '',
    suggestions: '',
    consent: false,
    signature: '',
    date: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name.startsWith('day1_')) {
        const fieldName = name.replace('day1_', '');
        setFormData({
          ...formData,
          eventsDay1: { ...formData.eventsDay1, [fieldName]: checked }
        });
      } else if (name.startsWith('day2_')) {
        const fieldName = name.replace('day2_', '');
        setFormData({
          ...formData,
          eventsDay2: { ...formData.eventsDay2, [fieldName]: checked }
        });
      } else {
        setFormData({ ...formData, [name]: checked });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission
    alert("Thank you for your response! We look forward to seeing you at the Alumni Meet.");
    onClose();
  };

  return (
    <div className="rsvp-modal-overlay">
      <div className="rsvp-modal-container">
        <button className="rsvp-close-btn" onClick={onClose}>&times;</button>
        
        <div className="rsvp-header">
          <h2>ALVAS ALUMNI MEET 2026</h2>
          <p>Thank you, dear alumni, for your interest in attending the Alumni Meet. Kindly fill in the following details to confirm your participation.</p>
        </div>

        <form className="rsvp-form" onSubmit={handleSubmit}>
          {/* SECTION 1: PERSONAL DETAILS */}
          <section className="rsvp-section">
            <h3>SECTION 1: PERSONAL DETAILS</h3>
            <div className="rsvp-grid">
              <div className="rsvp-group">
                <label>Full Name:</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="rsvp-group">
                <label>Year of Graduation:</label>
                <input type="text" name="yearOfGraduation" value={formData.yearOfGraduation} onChange={handleChange} required />
              </div>
              <div className="rsvp-group full-width">
                <label>Course / Department:</label>
                <input type="text" name="courseDept" value={formData.courseDept} onChange={handleChange} required />
              </div>
              <div className="rsvp-group full-width">
                <label>Name of Organization working in at present / Profession:</label>
                <input type="text" name="organization" value={formData.organization} onChange={handleChange} required />
              </div>
              <div className="rsvp-group">
                <label>Designation:</label>
                <input type="text" name="designation" value={formData.designation} onChange={handleChange} required />
              </div>
              <div className="rsvp-group">
                <label>City of Residence:</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} required />
              </div>
              <div className="rsvp-group">
                <label>Email Address:</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="rsvp-group">
                <label>Contact Number:</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
              </div>
            </div>
          </section>

          {/* SECTION 2: ATTENDANCE CONFIRMATION */}
          <section className="rsvp-section">
            <h3>SECTION 2: ATTENDANCE CONFIRMATION</h3>
            
            <div className="rsvp-question">
              <label>Will you be attending the Alumni Meet?</label>
              <div className="rsvp-radio-group">
                <label><input type="radio" name="attending" value="Yes" checked={formData.attending === 'Yes'} onChange={handleChange} required /> Yes</label>
                <label><input type="radio" name="attending" value="No" checked={formData.attending === 'No'} onChange={handleChange} required /> No</label>
              </div>
            </div>

            <div className="rsvp-question">
              <label>Will you be accompanied by family?</label>
              <div className="rsvp-radio-group">
                <label><input type="radio" name="accompaniedByFamily" value="Yes" checked={formData.accompaniedByFamily === 'Yes'} onChange={handleChange} /> Yes</label>
                <label><input type="radio" name="accompaniedByFamily" value="No" checked={formData.accompaniedByFamily === 'No'} onChange={handleChange} /> No</label>
              </div>
            </div>

            <div className="rsvp-inline-group">
              <label>If yes, number of family members:</label>
              <span>Adults: <input type="number" name="adults" min="0" className="small-input" value={formData.adults} onChange={handleChange} /></span>
              <span>Kids: <input type="number" name="kids" min="0" className="small-input" value={formData.kids} onChange={handleChange} /></span>
            </div>
          </section>

          {/* SECTION 3: EVENT PARTICIPATION (Day 1) */}
          <section className="rsvp-section highlight-section">
            <h3>SECTION 3: EVENT PARTICIPATION (Day 1)</h3>
            <p className="rsvp-subtext">Please select the events you would like to participate in:</p>
            
            <div className="rsvp-events-grid">
              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_networking" checked={formData.eventsDay1.networking} onChange={handleChange} />
                <div className="event-info">
                  <strong>Networking</strong>
                  <span>9:00 am to 10:30 am</span>
                  <i>Ambience: Breakfast</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_interactionSessions" checked={formData.eventsDay1.interactionSessions} onChange={handleChange} />
                <div className="event-info">
                  <strong>Branchwise Interaction sessions with students</strong>
                  <span>2:00 pm – 3:00 pm</span>
                  <i>Ambience: Classroom</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_campusTour" checked={formData.eventsDay1.campusTour} onChange={handleChange} />
                <div className="event-info">
                  <strong>Campus Tour</strong>
                  <span>10:30 am – 11:30 am</span>
                  <i>Ambience: AIET Campus</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_memoryWall" checked={formData.eventsDay1.memoryWall} onChange={handleChange} />
                <div className="event-info">
                  <strong>Memory Wall [One Photo One Story]</strong>
                  <span>3:00 pm – 3:45 pm</span>
                  <i>Ambience: New Building Entrance Porch</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_entrepreneurshipTalk" checked={formData.eventsDay1.entrepreneurshipTalk} onChange={handleChange} />
                <div className="event-info">
                  <strong>Entrepreneurship Talk (Formal)</strong>
                  <span>11:45 am to 1:00 pm</span>
                  <i>Ambience: Classroom</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_teaBreak" checked={formData.eventsDay1.teaBreak} onChange={handleChange} />
                <div className="event-info">
                  <strong>Tea Break</strong>
                  <span>3:45 pm to 4:15 pm</span>
                  <i>Ambience: Auditorium</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_alumniTalk" checked={formData.eventsDay1.alumniTalk} onChange={handleChange} />
                <div className="event-info">
                  <strong>Alumni Talk (Formal)</strong>
                  <span>11:45 am to 1:00 pm</span>
                  <i>Ambience: Classroom</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_interactionVivekAlva" checked={formData.eventsDay1.interactionVivekAlva} onChange={handleChange} />
                <div className="event-info">
                  <strong>Interaction with Vivek Alva</strong>
                  <span>4:30 pm – 5:00 pm</span>
                  <i>Ambience: Auditorium</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_askMeAnything" checked={formData.eventsDay1.askMeAnything} onChange={handleChange} />
                <div className="event-info">
                  <strong>Ask me Anything (Informal Interaction)</strong>
                  <span>11:45 am to 1:00 pm</span>
                  <i>Ambience: Classroom</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_inauguration" checked={formData.eventsDay1.inauguration} onChange={handleChange} />
                <div className="event-info">
                  <strong>Inauguration of Alumni Association & Impressions</strong>
                  <span>5:00 pm – 6:00 pm</span>
                  <i>Ambience: Auditorium</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_spotGames" checked={formData.eventsDay1.spotGames} onChange={handleChange} />
                <div className="event-info">
                  <strong>Spot Games</strong>
                  <span>11:45 am to 1:00 pm</span>
                  <i>Ambience: AIET Campus</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_culturalProgram" checked={formData.eventsDay1.culturalProgram} onChange={handleChange} />
                <div className="event-info">
                  <strong>Cultural Program</strong>
                  <span>5:00 pm – 6:00 pm</span>
                  <i>Ambience: Auditorium</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_lunchBreak" checked={formData.eventsDay1.lunchBreak} onChange={handleChange} />
                <div className="event-info">
                  <strong>Lunch Break</strong>
                  <span>1:00 pm – 2:00 pm</span>
                  <i>Ambience: Food Court</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day1_dinner" checked={formData.eventsDay1.dinner} onChange={handleChange} />
                <div className="event-info">
                  <strong>Dinner</strong>
                  <span>8:00 pm onwards</span>
                  <i>Ambience: Food Court</i>
                </div>
              </label>
            </div>
          </section>

          {/* SECTION 3: EVENT PARTICIPATION (Day 2) */}
          <section className="rsvp-section highlight-section">
            <h3>SECTION 3: EVENT PARTICIPATION (Day 2)</h3>
            
            <div className="rsvp-events-grid">
              <label className="rsvp-event-card">
                <input type="checkbox" name="day2_plantingSaplings" checked={formData.eventsDay2.plantingSaplings} onChange={handleChange} />
                <div className="event-info">
                  <strong>Planting Saplings</strong>
                  <span>7:30 am – 8:30 am</span>
                  <i>Ambience: Shobhavana</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day2_excursionSasithithlu" checked={formData.eventsDay2.excursionSasithithlu} onChange={handleChange} />
                <div className="event-info">
                  <strong>Excursion 1: Sasithithlu Beach</strong>
                  <span>9:00 am onwards</span>
                  <i>Ambience: Beach</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day2_breakfast" checked={formData.eventsDay2.breakfast} onChange={handleChange} />
                <div className="event-info">
                  <strong>Breakfast</strong>
                  <span>8:30 am – 9:30 am</span>
                  <i>Ambience: Food Court</i>
                </div>
              </label>

              <label className="rsvp-event-card">
                <input type="checkbox" name="day2_excursionKudremukh" checked={formData.eventsDay2.excursionKudremukh} onChange={handleChange} />
                <div className="event-info">
                  <strong>Excursion 2: Kudremukh Peak Point Trek</strong>
                  <span>9:00 am onwards</span>
                  <i>Ambience: Highlands</i>
                </div>
              </label>
            </div>
          </section>

          {/* SECTION 4: ADDITIONAL INFORMATION */}
          <section className="rsvp-section">
            <h3>SECTION 4: ADDITIONAL INFORMATION</h3>
            
            <div className="rsvp-group full-width">
              <label>Dietary Preferences (Veg/Non Veg):</label>
              <input type="text" name="dietaryPreference" value={formData.dietaryPreference} onChange={handleChange} />
            </div>

            <div className="rsvp-question">
              <label>Do you Need Accomodation on the campus? **</label>
              <div className="rsvp-radio-group">
                <label><input type="radio" name="needAccommodation" value="Yes" checked={formData.needAccommodation === 'Yes'} onChange={handleChange} /> Yes</label>
                <label><input type="radio" name="needAccommodation" value="No" checked={formData.needAccommodation === 'No'} onChange={handleChange} /> No</label>
              </div>
            </div>

            <div className="rsvp-group full-width">
              <label>Do you have any suggestions for the Alumni Meet?</label>
              <textarea name="suggestions" rows="3" value={formData.suggestions} onChange={handleChange}></textarea>
            </div>
          </section>

          {/* SECTION 5: CONSENT */}
          <section className="rsvp-section consent-section">
            <h3>SECTION 5: CONSENT</h3>
            
            <label className="consent-checkbox">
              <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} required />
              <span>I confirm that the information provided is accurate and I agree to participate in the Alumni Meet.</span>
            </label>

            <div className="rsvp-grid form-footer">
              {/* <div className="rsvp-group">
                <label>Signature (if printed form):</label>
                <input type="text" name="signature" value={formData.signature} onChange={handleChange} />
              </div> */}
              <div className="rsvp-group">
                <label>Date:</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>
            </div>
          </section>

          <div className="rsvp-actions">
            <button type="button" className="rsvp-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="rsvp-btn-submit" disabled={!formData.consent}>Submit Registration</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RSVPForm;
