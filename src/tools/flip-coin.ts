/**
* Flips a coin and returns "Heads" or "Tails".
*/
export default function flipCoin() {
    const value = Math.random();
    let result = "Tails";
    if (value > 0.5) {
        result = "Heads";
    }
    return result;
}