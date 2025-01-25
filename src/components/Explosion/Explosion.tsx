import Lottie from 'react-lottie';
import explosionAnimation from '../../assets/animations/explosion.json';
import { Position } from '../../types/chess';

interface ExplosionProps {
    position: Position;  // Your existing Position type
    onComplete?: () => void;
    size?: number;  // Optional size override
}

const ExplosionEffect: React.FC<ExplosionProps> = ({ 
    onComplete = () => {},
    size = 64  // Default to your square size
}) => {
    return (
        <div 
            className="absolute pointer-events-none"
            style={{
                width: size,
                height: size,
                // Add a higher z-index to ensure the explosion appears above pieces
                zIndex: 20
            }}
        >
            <Lottie 
                options={{
                    loop: false,
                    autoplay: true,
                    animationData: explosionAnimation,
                }}
                eventListeners={[
                    {
                        eventName: 'complete',
                        callback: () => onComplete()
                    }
                ]}
                isClickToPauseDisabled={true}
            />
        </div>
    );
};

export default ExplosionEffect;
