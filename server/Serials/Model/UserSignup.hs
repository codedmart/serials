{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Serials.Model.UserSignup where

import Prelude hiding (id)

import Control.Applicative
import Data.Text (Text)

import Data.Aeson (ToJSON, FromJSON)

import GHC.Generics
import Database.RethinkDB.NoClash hiding (table)

data UserSignup = UserSignup {
  firstName :: Text,
  lastName :: Text,
  email :: Text,
  password :: Text,
  passwordConfirmation :: Text
} deriving (Show, Generic)

instance FromJSON UserSignup
instance ToJSON UserSignup
instance FromDatum UserSignup
instance ToDatum UserSignup

