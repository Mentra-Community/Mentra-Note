/**
 * Router Configuration
 *
 * Defines all routes for the Notes app using Wouter.
 * Routes:
 * - / → HomePage (folder list)
 * - /day/:date → DayPage (day detail with tabs)
 * - /note/:id → NotePage (individual note view/editor)
 * - /settings → SettingsPage
 */

import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { HomePage } from "./pages/home/HomePage";
import { DayPage } from "./pages/day/DayPage";
import { NotePage } from "./pages/note/NotePage";
import { SettingsPage } from "./pages/settings/SettingsPage";

/** Renders routes frozen to a specific location so exit animations show the old page */
function FrozenRoutes({ location }: { location: string }) {
  return (
    <Switch location={location}>
      <Route path="/" component={HomePage} />
      <Route path="/day/:date" component={DayPage} />
      <Route path="/note/:id" component={NotePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route>
        <HomePage />
      </Route>
    </Switch>
  );
}

export function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        className="h-full"
      >
        <FrozenRoutes location={location} />
      </motion.div>
    </AnimatePresence>
  );
}
