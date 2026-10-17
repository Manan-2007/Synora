import lockupLight from "../assets/logo-lockup-light.png";
import lockupDark from "../assets/logo-lockup-dark.png";
import markLight from "../assets/logo-mark-light.png";
import markDark from "../assets/logo-mark-dark.png";
import stackedLight from "../assets/logo-stacked-light.png";
import stackedDark from "../assets/logo-stacked-dark.png";

/* The logo ships as two PNGs — one for light backgrounds, one for dark —
   and CSS (.logo .logo__light / .logo__dark) shows whichever matches the
   theme. Wrap this in an element carrying `logo logo--<variant>`. */
const VARIANTS = {
  lockup: { light: lockupLight, dark: lockupDark, width: 1040, height: 267, darkHeight: 267 },
  mark: { light: markLight, dark: markDark, width: 289, height: 266, darkHeight: 266 },
  stacked: { light: stackedLight, dark: stackedDark, width: 440, height: 385, darkHeight: 387 },
};

export default function LogoArt({ variant = "lockup" }) {
  const v = VARIANTS[variant];
  return (
    <>
      <img className="logo__light" src={v.light} alt="Synora" width={v.width} height={v.height} />
      <img className="logo__dark" src={v.dark} alt="" aria-hidden="true" width={v.width} height={v.darkHeight} />
    </>
  );
}
