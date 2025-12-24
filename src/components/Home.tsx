import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsIcon, ShoppingCartIcon, CalculatorIcon, UsersIcon } from 'lucide-react';
const Home = () => {
  return <div className="w-full">
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-6 md:mb-0 md:mr-8 text-center">
            {/* ASCII Art for retro computer mascot */}
            <pre className="font-mono text-xs md:text-sm leading-tight hidden md:block">
              {`
   _______
  |       |
  |  ^_^  |
  |_______|
 /|=======|\\
/ |       | \\
  |       |
  |_______|
  |       |
  |_______|
              `}
            </pre>
            <div className="md:hidden">
              <ComputerMascot />
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              WELCOME TO NIJHUM DIP
            </h1>
            <h2 className="text-xl md:text-2xl mb-6">
              Bachelor Meal Management System
            </h2>
            <p className="mb-6 text-lg">
              A retro-styled digital solution to manage your daily meals, bazar
              expenses, and monthly calculations with ease.
            </p>
            <Link to="/meal" className="inline-block bg-black text-white font-bold py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors duration-200">
              GET STARTED →
            </Link>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard icon={<UtensilsIcon className="w-12 h-12" />} title="MEAL TRACKING" description="Track lunch and dinner for all members with simple checkboxes." linkTo="/meal" />
        <FeatureCard icon={<ShoppingCartIcon className="w-12 h-12" />} title="BAZAR EXPENSE" description="Record and view all shopping expenses in a retro ledger." linkTo="/bazar" />
        <FeatureCard icon={<CalculatorIcon className="w-12 h-12" />} title="CALCULATIONS" description="View monthly stats and generate expense reports." linkTo="/calculate" />
        <FeatureCard icon={<UsersIcon className="w-12 h-12" />} title="MEMBER SETTINGS" description="Add, edit, or remove members from your bachelor group." linkTo="/settings" />
      </div>
    </div>;
};
const ComputerMascot = () => <div className="text-center">
    <div className="inline-block border-4 border-black p-4 mb-2">
      <div className="text-3xl font-bold">^_^</div>
    </div>
    <div className="h-4 w-16 mx-auto border-l-4 border-r-4 border-black"></div>
    <div className="h-8 w-24 mx-auto border-4 border-t-0 border-black"></div>
  </div>;
const FeatureCard = ({
  icon,
  title,
  description,
  linkTo
}) => <Link to={linkTo} className="block">
    <div className="bg-white border-4 border-black p-6 h-full hover:bg-gray-100 transition-colors duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="mb-4">{description}</p>
        <span className="font-bold">EXPLORE →</span>
      </div>
    </div>
  </Link>;
export default Home;