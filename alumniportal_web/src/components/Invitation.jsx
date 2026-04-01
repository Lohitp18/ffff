import React, { useState } from 'react';
import './Invitation.css';
import RSVPForm from './RSVPForm';

const Invitation = () => {
  const [isRSVPOpen, setIsRSVPOpen] = useState(false);

  return (
    <div className="invitation-container">
      <div className="invitation-content">
        <h1 className="invitation-title">Alva's Engineering Alumni Meet - 2026</h1>
        
        <div className="invitation-body">
          <p className="salutation">Dear Alumni,</p>
          <p className="greetings">Greetings from Alva's Institute of Engineering and Technology, Moodabidri.</p>
          
          <p className="main-message">
            You will be delighted to know that an <strong>"Alumni Meet"</strong> is being hosted on <strong>May 16 & 17, 2026</strong> at the AIET campus. It is a special occasion for you to reconnect, reminisce, and celebrate the enduring bond you share with your alma mater. The event will bring together alumni from different batches and branches to relive cherished memories, network with fellow alumni, and witness how your "alma mater" has grown.
          </p>
          
          <p className="main-message">
            Your presence will truly make the gathering more meaningful and memorable. We look forward to welcoming you back to campus, and celebrate the journey we have shared.
          </p>
          
          <div className="event-details">
            <p><strong>Alumni meet on:</strong> 16th & 17th May 2026</p>
            <p><strong>Venue:</strong> AIET</p>
            <p className="deadline">Kindly confirm your participation by: <strong>25th April 2026</strong>.</p>
          </div>
          
          <div className="sign-off">
            <p>Warm Regards,</p>
            <p><strong>THE MANAGEMENT, PRINCIPAL & STAFF</strong></p>
          </div>
          
          {/* <p className="enclosure">Encl.: Registration Form</p> */}
        </div>

        <button 
          className="invitation-register-btn"
          onClick={() => setIsRSVPOpen(true)}
        >
          Register Now
        </button>
      </div>

      <RSVPForm isOpen={isRSVPOpen} onClose={() => setIsRSVPOpen(false)} />
    </div>
  );
};

export default Invitation;
