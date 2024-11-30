class TournamentManager:
    def __init__(self):
        self.tournaments = {}

    def set_config(self, max_players, tournament_name):
        if tournament_name not in self.tournaments:
            self.tournaments[tournament_name] = {
                'players': [],
                'max_players': int(max_players),
                'winners': [],
                'round_winners': [],
                'channel_names': {}
            }
            return True
        return False

    def add_player(self, tournament_name, player_name, channel_name):
        tournament = self.tournaments.get(tournament_name)
        if tournament and len(tournament['players']) < tournament['max_players']:
            tournament['players'].append((player_name, channel_name))
            tournament['channel_names'][player_name] = channel_name
            return True
        return False

    def get_players(self, tournament_name):
        return self.tournaments[tournament_name]['players']

    def is_full(self, tournament_name):
        tournament = self.tournaments[tournament_name]
        return len(tournament['players']) == tournament['max_players']

    def add_winner(self, tournament_name, winner):
        if winner not in self.tournaments[tournament_name]['round_winners']:
            self.tournaments[tournament_name]['round_winners'].append(winner)

    def is_round_complete(self, tournament_name):
        tournament = self.tournaments[tournament_name]
        return len(tournament['round_winners']) == len(tournament['players']) // 2

    def get_round_winners(self, tournament_name):
        return self.tournaments[tournament_name]['round_winners']

    def reset_round(self, tournament_name):
        tournament = self.tournaments[tournament_name]
        tournament['players'] = []
        for winner in tournament['round_winners']:
            if winner in tournament['channel_names']:
                tournament['players'].append((winner, tournament['channel_names'][winner]))
        tournament['round_winners'] = []

    def is_tournament_over(self, tournament_name):
        tournament = self.tournaments[tournament_name]
        return len(tournament['round_winners']) == 1 and len(tournament['players']) == 2

    def get_tournament_winner(self, tournament_name):
        return self.tournaments[tournament_name]['round_winners'][0]

    def get_channel_name(self, tournament_name, player_name):
        return self.tournaments[tournament_name]['channel_names'][player_name]
    
    def delete_tournament(self, tournament_name):
        if tournament_name in self.tournaments:
            del self.tournaments[tournament_name]
            return True
        return False
    def tournament_exists(self, tournament_name):
        return tournament_name in self.tournaments