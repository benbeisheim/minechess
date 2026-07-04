import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import bombman from '../../assets/animations/bombman.json';
import { useRef } from 'react';
import React from 'react';

interface BombmanProps {
  className?: string; // Optional class for styling
}

const Bombman: React.FC<BombmanProps> = ({ className = '' }) => {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null); // Reference to control the animation

  return (
    <div className={`${className}`}>
      <Lottie
        lottieRef={lottieRef} // Attach the reference to the Lottie animation
        animationData={bombman} // The animation JSON data
        loop={true} // Looping configuration
        autoplay={true} // Autoplay configuration
      />
    </div>
  );
};

export default Bombman;