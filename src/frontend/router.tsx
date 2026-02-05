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

import { Route, Switch } from "wouter";
import { HomePage } from "./pages/home/HomePage";
import { DayPage } from "./pages/day/DayPage";
import { NotePage } from "./pages/note/NotePage";
import { SettingsPage } from "./pages/settings/SettingsPage";

export function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/day/:date" component={DayPage} />
      <Route path="/note/:id" component={NotePage} />
      <Route path="/settings" component={SettingsPage} />

      {/* Fallback to home for unknown routes */}
      <Route>
        <HomePage />
      </Route>
    </Switch>
  );
}
