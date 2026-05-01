from __future__ import annotations

import torch
from torch import nn


class PairwiseActionNet(nn.Module):
    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 64):
        super().__init__()
        self.state_encoder = nn.Sequential(nn.Linear(state_dim, hidden_dim), nn.ReLU())
        self.action_encoder = nn.Sequential(nn.Linear(action_dim, hidden_dim), nn.ReLU())
        self.head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, state_features: torch.Tensor, action_features: torch.Tensor) -> torch.Tensor:
        state_encoded = self.state_encoder(state_features)
        action_encoded = self.action_encoder(action_features)
        expanded_state = state_encoded.unsqueeze(1).expand(-1, action_features.shape[1], -1)
        return self.head(torch.cat([expanded_state, action_encoded], dim=-1)).squeeze(-1)


class BehaviorPolicyNet(PairwiseActionNet):
    pass


class QNetwork(PairwiseActionNet):
    pass


class ValueNetwork(nn.Module):
    def __init__(self, state_dim: int, hidden_dim: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, state_features: torch.Tensor) -> torch.Tensor:
        return self.net(state_features).squeeze(-1)


def masked_logits(logits: torch.Tensor, legal_mask: torch.Tensor) -> torch.Tensor:
    return logits.masked_fill(~legal_mask, -1e9)


def masked_argmax(logits: torch.Tensor, legal_mask: torch.Tensor) -> torch.Tensor:
    return torch.argmax(masked_logits(logits, legal_mask), dim=-1)
