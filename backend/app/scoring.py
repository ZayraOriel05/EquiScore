import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import numpy as np

# In a real app, this would load a saved .joblib model file.
# For the prototype, we'll create a simple model that learns from a small set of alternative data.
class CreditScorer:
    def __init__(self):
        # Features: [MobileMoneyUsage, UtilityPaymentConsistency, BusinessCashFlow, PsychometricScore]
        self.X_train = np.array([
            [100, 0.9, 500, 80], # Good borrower
            [20, 0.3, 100, 40],  # High risk
            [50, 0.7, 300, 60],  # Medium risk
            [120, 0.95, 600, 85],# Good borrower
            [10, 0.2, 50, 30],   # High risk
        ])
        self.y_train = np.array([1, 0, 1, 1, 0]) # 1 = likely to repay, 0 = risk
        self.model = RandomForestClassifier(n_estimators=10)
        self.model.fit(self.X_train, self.y_train)

    def predict_score(self, data):
        # data: [MobileMoneyUsage, UtilityPaymentConsistency, BusinessCashFlow, PsychometricScore]
        prediction = self.model.predict_proba([data])[0][1] # Probability of class 1
        return round(prediction * 100, 2) # Return as a score out of 100

scorer = CreditScorer()
