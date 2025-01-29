import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import explosionAnimation from '../../assets/animations/bwexplosion.json';
import { Position } from '../../types/chess';
import { useEffect, useRef, useState } from 'react';

interface ExplosionProps {
    position: Position;  // Your existing Position type
    onComplete?: () => void;
    size?: number;  // Optional size override
}

const ExplosionEffect: React.FC<ExplosionProps> = ({ 
    onComplete = () => {},
    size = 64  // Default to your square size
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    useEffect(() => {
        if (lottieRef.current) {
            lottieRef.current.setSpeed(0.8);
        }
    }, []);

    const handleComplete = () => {
        setIsVisible(false);
        onComplete();
    }

    if (!isVisible) {
        return null;
    }

    return (
        <div 
            className={`absolute pointer-events-none`}
            style={{
                width: size,
                height: size,
                // Add a higher z-index to ensure the explosion appears above pieces
                zIndex: 20
            }}
        >
            <Lottie 
                lottieRef={lottieRef}
                animationData={explosionAnimation}
                loop={false}
                autoplay={true}
                onComplete={handleComplete}
            />
        </div>
    );
};

export default ExplosionEffect;