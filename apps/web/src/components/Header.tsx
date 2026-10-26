import { CupIcon } from './Icons';

export function Header({ savedCount }: { savedCount: number }) {
  return (
    <header className="header">
      <a href="#top" className="brand">
        <CupIcon className="brand__icon" />
        <span>Velvet Brew</span>
      </a>
      {savedCount > 0 && (
        <a href="#saved" className="header__saved">
          Saved <span className="count">{savedCount}</span>
        </a>
      )}
    </header>
  );
}
