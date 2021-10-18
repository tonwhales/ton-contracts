# Validator Controller Contract

This smart contract is built to be safe in the case of validator hack. 

### Configuration
This contract have three parameters:

* `master key`: signing key that allows everything you can do with a wallet with same api as simple wallet.
* `restricted key`: signinig key that could be stored in unsafe (but on blatantly in the open) and allows automatisations of participating
  in elections and validation session. Also this key is restrited to a one transaction per 5 minutes.
* `restricted address`: Address of an elector, we are not using configuration just to avoid blindly folowing configuration changes. Also this unlocks various customizations.

### Restrictions

What restricted key can do:

* Send internal messages to restricted address
* .. that must be `bounceable`
* .. that must have `bounce` flag NOT set
* .. with body that must start with one of: `0x4e73744b` (send new stake), `0x47657424` (recover stake), `0x52674370` (new complaint) or `0x56744370` (vote for complaint)
* Could send transactions only once in 5 minutes
* Participate in validation for **any** possible validator key

What restricted key can't do:

* Transfer coins anywhere except elector
* Transfer coins to elector in a recoverrable way
* Vote for configuration changes
* Utilize race conditions in the network to outrun master key

# LICENSE
MIT