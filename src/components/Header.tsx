import { CupIcon } from './Icons';

export function Header() {
  return (
    <header className="header">
      <a href="#top" className="brand">
        <CupIcon className="brand__icon" />
        <span>Velvet Brew</span>
      </a>
    </header>
  );
}
