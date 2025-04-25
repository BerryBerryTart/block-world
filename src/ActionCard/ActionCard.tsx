import "./ActionCard.less";
import { getBlockColour } from "../utils";
import arrow from "../assets/arrow.png";

interface ActionProps {
  from: number;
  to: number;
  totalBlocks: number;
  clickFunc?: () => void;
  history?: boolean;
}

export const ActionCard = (props: ActionProps) => {
  const { from, to, totalBlocks, clickFunc, history } = props;
  const getBgGradient = () => {
    const start = getBlockColour(from, totalBlocks);
    const end = getBlockColour(to, totalBlocks);
    return `linear-gradient(90deg, ${start} 0%, ${end} 100%)`;
  };
  return (
    <div
      className={history ? "historyCard actionCard" : "actionCard"}
      style={{ background: getBgGradient() }}
      onClick={clickFunc ? () => clickFunc() : undefined}
    >
      <span>{from > 0 ? from : "TABLE"}</span>
      <img className="transferIcon" src={arrow} alt={`move ${from} to ${to}`} />
      <span>{to > 0 ? to : "TABLE"}</span>
    </div>
  );
};
