{-# LANGUAGE DataKinds #-}
{-# LANGUAGE PolyKinds #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Serials.Api where

import Control.Applicative 
import Control.Monad.IO.Class (liftIO)
import Control.Monad.Trans.Either

import Data.Aeson
import Data.Monoid
import Data.Proxy
import Data.Text (Text, toUpper)
import Data.Maybe (fromJust)

import GHC.Generics

import Network.HTTP.Types.Status
import Network.Wai
import Network.Wai.Handler.Warp (run, Port)
import Network.Wai.Middleware.Cors
import Network.Wai.Middleware.AddHeaders

import Serials.Model.Source
import Serials.Model.Chapter 
import Serials.Model.App
import Serials.Scan

--import Web.Scotty
import Servant

import Database.RethinkDB.NoClash (RethinkDBHandle, use, db, connect, RethinkDBError)

type API =

  Get AppInfo

  :<|> "sources" :> Get [Source]
  :<|> "sources" :> ReqBody Source :> Post Text

  :<|> "sources" :> Capture "id" Text :> Get Source
  :<|> "sources" :> Capture "id" Text :> ReqBody Source :> Put ()
  :<|> "sources" :> Capture "id" Text :> Delete

  :<|> "sources" :> Capture "id" Text :> "chapters" :> Get [Chapter]
  :<|> "sources" :> Capture "id" Text :> "chapters" :> Post ()

api :: Proxy API
api = Proxy

server :: RethinkDBHandle -> Server API
server h = 
    appInfo 
    :<|> sourcesGetAll :<|> sourcesPost 
    :<|> sourcesGet :<|> sourcesPut :<|> sourcesDel
    :<|> chaptersGet :<|> sourceScan

  where 

  appInfo = return $ AppInfo "Serials" "0.1.0"

  sourcesGetAll = liftIO $ sourcesList h
  sourcesPost s = liftIO $ sourcesCreate h s

  sourcesGet id   = liftE  $ sourcesFind h id
  sourcesPut id s = liftIO $ sourcesSave h id s
  sourcesDel id   = liftIO $ sourcesRemove h id

  chaptersGet id = liftIO $ chaptersBySource h id
  sourceScan  id = liftE  $ importSource h id


stack :: Application -> Application
stack = heads . cors'
  where
    heads = addHeaders [("X-Source", "Contribute at http://github.com/seanhess/serials")]
    cors' = cors (const $ Just corsResourcePolicy)


-- Run ---------------------------------------------------------

runApi :: Int -> IO ()
runApi port = do
    putStrLn $ "Running on " <> show port
    h <- connectDb
    sourcesInit h
    chaptersInit h
    --scotty port (routes h)
    run port $ stack $ serve api (server h)
    return ()

-- DB -----------------------------------------------------------

connectDb :: IO RethinkDBHandle
connectDb = use serialsDb <$> connect "localhost" 28015 Nothing

serialsDb = db serialsDbName
serialsDbName = "serials"

-- Cors ---------------------------------------------------------

corsResourcePolicy :: CorsResourcePolicy
corsResourcePolicy = CorsResourcePolicy
    { corsOrigins = Nothing
    , corsMethods = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"]
    , corsRequestHeaders = simpleResponseHeaders
    , corsExposedHeaders = Nothing
    , corsMaxAge = Nothing
    , corsVaryOrigin = False
    , corsRequireOrigin = False
    , corsIgnoreFailures = False
    }

-- ToStatus ------------------------------------------------------

class ToStatus a where
    toStatus :: a val -> Either (Int, String) val

instance ToStatus Maybe where
    toStatus Nothing  = Left (404, "Not Found")
    toStatus (Just v) = Right v

instance Show a => ToStatus (Either a) where
    toStatus (Left e) = Left (500, "Server Error: " <> show e)
    toStatus (Right v) = Right v

liftE :: ToStatus a => IO (a v) -> EitherT (Int, String) IO v
liftE action = EitherT $ toStatus <$> action
