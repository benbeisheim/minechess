import { PieceType, PlayerColor } from '../../types/chess';
import { getPieceImage } from '../../utils/pieces';

interface PromotionChoiceProps {
    handlePromotionClick: (pieceType: PieceType) => void;
    orientation: PlayerColor;
}

const PromotionChoice: React.FC<PromotionChoiceProps> = ({handlePromotionClick, orientation}) => {
    const color = orientation === 'white' ? 'white' : 'black';
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            <img className="w-full h-full" src={getPieceImage(color, 'queen')} onClick={() => handlePromotionClick('queen')}/>
            <img className="w-full h-full" src={getPieceImage(color, 'rook')} onClick={() => handlePromotionClick('rook')}/>
            <img className="w-full h-full" src={getPieceImage(color, 'bishop')} onClick={() => handlePromotionClick('bishop')}/>
            <img className="w-full h-full" src={getPieceImage(color, 'knight')} onClick={() => handlePromotionClick('knight')}/>
        </div>
    );
}

export default PromotionChoice;