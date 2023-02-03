// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract NFTMarketplace is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 listingPrice = 0.0000025 ether;
    address payable owner;

    mapping(uint256 => MarketItem) private idToMarketItem;
    mapping(uint256 => mapping(address => uint256)) public bids;
    mapping(uint256 => uint256) public trackingBidderCount;
    mapping(uint256 => mapping(uint256 => address))
        public trackingBidderAddress;

    struct MarketItem {
        uint256 tokenId;
        address creator;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool auction;
        uint256 endTime;
        bool ended;
        uint256 highestBid;
        address payable highestBidder;
    }

    event MarketItemCreated(
        uint256 indexed tokenId,
        address creator,
        address seller,
        address owner,
        uint256 price,
        bool sold,
        bool auction,
        uint256 endTime,
        bool ended,
        uint256 highestBid,
        address highestBidder
    );

    event Withdraw(address sender, uint256 amount, bool bidder);

    constructor() ERC721("Metaverse Tokens", "METT") {
        owner = payable(msg.sender);
    }

    /* Updates the listing price of the contract */
    function updateListingPrice(uint256 _listingPrice) public payable {
        require(
            owner == msg.sender,
            "Only marketplace owner can update listing price."
        );
        listingPrice = _listingPrice;
    }

    /* Returns the listing price of the contract */
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    /* Mints a token and lists it in the marketplace */
    function createToken(
        string memory tokenURI,
        uint256 price,
        bool auction,
        uint256 endTime
    ) public payable returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price, auction, endTime);
        return newTokenId;
    }

    function createMarketItem(
        uint256 tokenId,
        uint256 price,
        bool auction,
        uint256 endTime
    ) private {
        require(price > 0, "Price must be at least 1 wei");
        require(
            msg.value == listingPrice,
            "Value must be equal to listing price"
        );

        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            msg.sender,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            auction,
            endTime,
            false,
            price,
            payable(address(0))
        );

        _transfer(msg.sender, address(this), tokenId);
        emit MarketItemCreated(
            tokenId,
            msg.sender,
            msg.sender,
            address(this),
            price,
            false,
            auction,
            endTime,
            false,
            price,
            payable(address(0))
        );
    }

    /*******************************************************************************
     *                               MARKETPLACE FUNCTION                           *
     ********************************************************************************/

    /* allows someone to resell a token they have purchased */
    function resellToken(uint256 tokenId, uint256 price) public payable {
        require(
            idToMarketItem[tokenId].owner == msg.sender,
            "Only item owner can perform this operation"
        );
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );

        idToMarketItem[tokenId].sold = false;
        idToMarketItem[tokenId].price = price;
        idToMarketItem[tokenId].seller = payable(msg.sender);
        idToMarketItem[tokenId].owner = payable(address(this));
        _itemsSold.decrement();

        _transfer(msg.sender, address(this), tokenId);
    }

    /* Creates the sale of a marketplace item */
    /* Transfers ownership of the item, as well as funds between parties */
    function createMarketSale(uint256 tokenId) public payable {
        uint256 price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        require(
            msg.value == price,
            "Please submit the asking price in order to complete the purchase"
        );
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].seller = payable(address(0));
        _itemsSold.increment();
        _transfer(address(this), msg.sender, tokenId);
        payable(owner).transfer(listingPrice);
        payable(seller).transfer(msg.value);
    }

    /* Unlist item and return back to seller */
    function unlistMarketItem(uint256 tokenId) public payable {
        address seller = idToMarketItem[tokenId].seller;
        require(
            msg.value == listingPrice,
            "Please submit value equal to listing price"
        );
        require(msg.sender == seller, "You are not seller");
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].seller = payable(address(0));
        _itemsSold.increment();
        _transfer(address(this), msg.sender, tokenId);
        payable(owner).transfer(listingPrice);
    }

    /* Returns all unsold market items */
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldMarketItem = 0;

        for (uint256 i = 0; i < itemCount; i++) {
            if (
                idToMarketItem[i + 1].owner == address(this) &&
                idToMarketItem[i + 1].auction == false
            ) {
                unsoldMarketItem += 1;
            }
        }

        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unsoldMarketItem);
        for (uint256 i = 0; i < itemCount; i++) {
            if (
                idToMarketItem[i + 1].owner == address(this) &&
                idToMarketItem[i + 1].auction == false
            ) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items that a user has purchased */
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items a user has listed */
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (
                idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].auction == false
            ) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (
                idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].auction == false
            ) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items a user has created */
    function fetchCreatedItems() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].creator == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].creator == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items a user has auctioned */
    function fetchAuctionedItems() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (
                idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].auction == true
            ) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (
                idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].auction == true
            ) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /*******************************************************************************
     *                          ENGLISH AUCTION FUNCTION                            *
     ********************************************************************************/

    /* Returns all unsold auction items */
    function fetchAuctionItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds.current();

        uint256 auctionItemCount = 0;

        for (uint256 i = 0; i < itemCount; i++) {
            if (
                // idToMarketItem[i + 1].owner == address(this) &&
                idToMarketItem[i + 1].auction == true
            ) {
                auctionItemCount += 1;
            }
        }

        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](auctionItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (
                // idToMarketItem[i + 1].owner == address(this) &&
                idToMarketItem[i + 1].auction == true
            ) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Bidding auction item */
    function bid(uint256 tokenId) public payable {
        uint256 endTime = idToMarketItem[tokenId].endTime;
        uint256 highestBid = idToMarketItem[tokenId].highestBid;
        address highestBidder = idToMarketItem[tokenId].highestBidder;

        require(uint256(block.timestamp) < endTime, "Auction has ended");
        require(
            msg.value > highestBid,
            "Value must be greater than current highest bid"
        );

        if (highestBidder != address(0)) {
            bids[tokenId][highestBidder] += highestBid;

            if (trackingBidderCount[tokenId] == 0) {
                trackingBidderCount[tokenId] += 1;
                uint256 curentIndex = trackingBidderCount[tokenId];
                trackingBidderAddress[tokenId][curentIndex] = highestBidder;
            } else {
                uint256 bidderCount = trackingBidderCount[tokenId];
                // uint256 senderIndex = 0;

                for (uint256 i = 0; i < bidderCount; i++) {
                    if (
                        trackingBidderAddress[tokenId][i + 1] == highestBidder
                    ) {
                        break;
                    }
                }
                trackingBidderCount[tokenId] += 1;
                uint256 curentIndex = trackingBidderCount[tokenId];
                trackingBidderAddress[tokenId][curentIndex] = highestBidder;
            }
        }

        idToMarketItem[tokenId].highestBidder = payable(msg.sender);
        idToMarketItem[tokenId].highestBid = msg.value;

        // emit Bid(msg.sender, msg.value);
    }

    /* Withdraw when sender are not highestBidder */
    function withdraw(uint256 tokenId) public payable {
        uint256 bidderCount = trackingBidderCount[tokenId];
        uint256 senderIndex = 0;

        for (uint256 i = 0; i < bidderCount; i++) {
            if (trackingBidderAddress[tokenId][i + 1] == msg.sender) {
                senderIndex = i + 1;
                uint256 balance = bids[tokenId][msg.sender];
                bids[tokenId][msg.sender] = 0;
                require(balance > 0, "Already withdrawed");
                payable(msg.sender).transfer(balance);
                emit Withdraw(msg.sender, balance, true);
                break;
            }
        }

        require(senderIndex > 0, "Not bidder");

        /**
         * Check all bidder withdraw their bid
         */
        bool withDrawAll = true;

        for (uint256 i = 0; i < bidderCount; i++) {
            address currentAddress = trackingBidderAddress[tokenId][i + 1];
            if (bids[tokenId][currentAddress] != 0) {
                withDrawAll = false;
                break;
            }
        }

        if (withDrawAll) {
            idToMarketItem[tokenId].auction = false;
        }

        // emit Withdraw(msg.sender, bal);
    }

    /* End auction */
    function endAuction(uint256 tokenId) external {
        uint256 bidderCount = trackingBidderCount[tokenId];

        uint256 endTime = idToMarketItem[tokenId].endTime;
        bool ended = idToMarketItem[tokenId].ended;

        // require(
        //     uint256(block.timestamp) >= endTime,
        //     "Auction time has not ended yet"
        // );
        require(!ended, "Auction has ended");

        idToMarketItem[tokenId].ended = true;
        _itemsSold.increment();
        address seller = idToMarketItem[tokenId].seller;
        address highestBidder = idToMarketItem[tokenId].highestBidder;
        uint256 highestBid = idToMarketItem[tokenId].highestBid;

        if (highestBidder != address(0)) {
            idToMarketItem[tokenId].owner = payable(highestBidder);
            idToMarketItem[tokenId].sold = true;
            idToMarketItem[tokenId].seller = payable(address(0));
            idToMarketItem[tokenId].auction = true;
            idToMarketItem[tokenId].highestBidder = payable(address(0));
            idToMarketItem[tokenId].highestBid = 0;
            idToMarketItem[tokenId].price = highestBid;
            _safeTransfer(address(this), highestBidder, tokenId, "");
            payable(seller).transfer(highestBid);

            /**
             * Check all bidder withdraw their bid
             */
            bool withDrawAll = true;

            for (uint256 i = 0; i < bidderCount; i++) {
                address currentAddress = trackingBidderAddress[tokenId][i + 1];
                if (bids[tokenId][currentAddress] != 0) {
                    withDrawAll = false;
                    break;
                }
            }

            if (withDrawAll) {
                idToMarketItem[tokenId].auction = false;
            }
        } else {
            idToMarketItem[tokenId].owner = payable(seller);
            idToMarketItem[tokenId].sold = true;
            idToMarketItem[tokenId].seller = payable(seller);
            idToMarketItem[tokenId].auction = false;
            idToMarketItem[tokenId].highestBidder = payable(address(0));
            idToMarketItem[tokenId].highestBid = 0;
            _safeTransfer(address(this), seller, tokenId, "");
        }

        // emit End(highestBidder, highestBid);
    }

    /* allows someone to resell a token they have purchased */
    function reauctionToken(
        uint256 tokenId,
        uint256 price,
        uint256 endTime
    ) public payable {
        require(
            idToMarketItem[tokenId].owner == msg.sender,
            "Only item owner can perform this operation"
        );
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );

        idToMarketItem[tokenId].sold = false;
        idToMarketItem[tokenId].price = price;
        idToMarketItem[tokenId].seller = payable(msg.sender);
        idToMarketItem[tokenId].owner = payable(address(this));
        idToMarketItem[tokenId].highestBid = price;
        idToMarketItem[tokenId].auction = true;
        idToMarketItem[tokenId].endTime = endTime;
        idToMarketItem[tokenId].ended = false;
        _itemsSold.decrement();

        _transfer(msg.sender, address(this), tokenId);
    }
}
