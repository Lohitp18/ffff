import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCreative, Navigation, Autoplay } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-creative";
import "swiper/css/navigation";
import "./PageFlipSlider.css";

const PageFlipSlider = () => {
  const swiperRef = useRef(null);

  const slides = [
    {
      image: "https://picsum.photos/id/1018/1200/800",
      title: "Academic Excellence",
      description:
        "Nurturing talent and fostering innovation in every student.",
    },
    {
      image: "https://picsum.photos/id/1019/1200/800",
      title: "Global Alumni Network",
      description: "Connecting thousands of professionals across the globe.",
    },
    {
      image: "https://picsum.photos/id/1031/1200/800",
      title: "Lifetime Connections",
      description: "Your alma mater is always here to support your journey.",
    },
  ];

  return (
    <div className="page-flip-container">
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        grabCursor={true}
        effect={"creative"}
        speed={800}
        loop={true}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        creativeEffect={{
          prev: {
            shadow: false,
            translate: ["-120%", 0, -500],
            rotate: [0, 0, -20],
          },
          next: {
            shadow: false,
            translate: ["120%", 0, -500],
            rotate: [0, 0, 20],
          },
        }}
        modules={[EffectCreative, Navigation, Autoplay]}
        className="mySwiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <img src={slide.image} alt={slide.title} className="slider-image" />
            <div className="slide-overlay">
              <h2 className="slide-title">{slide.title}</h2>
              <p className="slide-description">{slide.description}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons */}
      <div
        className="nav-button prev"
        onClick={() => swiperRef.current?.slidePrev()}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="nav-icon"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        className="nav-button next"
        onClick={() => swiperRef.current?.slideNext()}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="nav-icon"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 5l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export default PageFlipSlider;
